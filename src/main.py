# -*- coding: utf-8 -*-
import logging
import multiprocessing
import os
import time
import wave
from multiprocessing import set_start_method
from multiprocessing.queues import Queue
from typing import Optional

import uvicorn
from fastapi import Cookie, Depends, FastAPI, Query, WebSocket, status, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.responses import FileResponse

format = "%(asctime)s: %(message)s"
logging.basicConfig(format=format, level=logging.DEBUG,
                    datefmt="%H:%M:%S")
try:
    set_start_method('spawn')
except RuntimeError as e:
    print(e)

app = FastAPI()

root = os.path.dirname(__file__)

app.mount('/static', StaticFiles(directory=os.path.join(root, 'static')), name='static')

templates = Jinja2Templates(directory=os.path.join(root, 'templates'))


@app.get('/favicon.ico')
async def get():
    return FileResponse(os.path.join(root, 'static', 'favicon.ico'))


@app.get("/")
async def get(request: Request):
    return templates.TemplateResponse('index.html', {'request': request})


async def get_cookie_or_token(
        websocket: WebSocket,
        session: Optional[str] = Cookie(None),
        token: Optional[str] = Query(None),
):
    if session is None and token is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
    return session or token


def wav_worker(q: Queue, uid: str, ):
    root = os.path.join(os.path.dirname(__file__), 'upload_waves')
    os.makedirs(root, exist_ok=True)
    filename = os.path.join(root, f'{uid}_{time.time()}.wav')
    try:
        wav = wave.open(filename, mode='wb')
        wav.setframerate(16000)
        wav.setnchannels(1)
        wav.setsampwidth(2)

        while True:
            data_bytes = q.get()
            wav.writeframes(data_bytes)


    except Exception as e:
        logging.debug(e)
    finally:
        wav.close()

    logging.info('leave wav_worker')


@app.websocket("/items/{item_id}/ws")
async def websocket_endpoint(
        websocket: WebSocket,
        item_id: str,
        q: Optional[int] = None,
        cookie_or_token: str = Depends(get_cookie_or_token),
):
    await websocket.accept()
    logging.info('websocket.accept')

    ctx = multiprocessing.get_context()
    queue = ctx.Queue()
    process = ctx.Process(target=wav_worker, args=(queue, item_id))
    process.start()
    counter = 0

    try:
        while True:
            data_bytes = await websocket.receive_bytes()
            data = [int.from_bytes(data_bytes[i:i + 2], byteorder='little', signed=True) for i in
                    range(0, len(data_bytes), 2)]
            await websocket.send_text(
                f"Session cookie or query token value is: {cookie_or_token}. counter {counter}"
            )
            if q is not None:
                await websocket.send_text(f"Query parameter q is: {q}")
            # await websocket.send_text(f"Message text was: {data}, for item ID: {item_id}")

            queue.put(data_bytes)
            counter += 1

    except Exception as e:
        logging.debug(e)
    finally:
        # Wait for the worker to finish
        queue.close()
        queue.join_thread()
        # use terminate so the while True loop in process will exit
        process.terminate()
        process.join()

    logging.info('leave websocket_endpoint')


if __name__ == '__main__':
    uvicorn.run('main:app', host='0.0.0.0', reload=True, log_level='warning',
                ssl_keyfile=os.path.join(root, '..', 'key.pem'),
                ssl_certfile=os.path.join(root, '..', 'cert.pem'))
