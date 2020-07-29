var ws = null;

function connect(event) {
    var itemId = document.getElementById("itemId")
    var token = document.getElementById("token")
    ws = new WebSocket("ws://localhost:8000/items/" + itemId.value + "/ws?token=" + token.value);
    ws.onmessage = function (event) {
        var messages = document.getElementById('messages')
        var message = document.createElement('li')
        var content = document.createTextNode(event.data)
        message.appendChild(content)
        messages.appendChild(message)
    };
    event.preventDefault()
}

function sendMessage(event) {
    var input = document.getElementById("messageText")
    ws.send(input.value)
    input.value = ''
    event.preventDefault()
}


const handleSuccess = function (stream) {
    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const processor = context.createScriptProcessor(1024, 1, 1);

    source.connect(processor);
    processor.connect(context.destination);

    processor.onaudioprocess = function (e) {
        // Do something with the data, e.g. convert it to WAV

        let sourceAudioBuffer = e.inputBuffer;
        // `sourceAudioBuffer` is an AudioBuffer instance of the source audio
        // at the original sample rate.
        const DESIRED_SAMPLE_RATE = 16000;
        const offlineCtx = new OfflineAudioContext(sourceAudioBuffer.numberOfChannels, sourceAudioBuffer.duration * DESIRED_SAMPLE_RATE, DESIRED_SAMPLE_RATE);
        const cloneBuffer = offlineCtx.createBuffer(sourceAudioBuffer.numberOfChannels, sourceAudioBuffer.length, sourceAudioBuffer.sampleRate);
        // Copy the source data into the offline AudioBuffer
        for (let channel = 0; channel < sourceAudioBuffer.numberOfChannels; channel++) {
            cloneBuffer.copyToChannel(sourceAudioBuffer.getChannelData(channel), channel);
        }
        // Play it from the beginning.
        const source = offlineCtx.createBufferSource();
        source.buffer = cloneBuffer;
        source.connect(offlineCtx.destination);
        offlineCtx.oncomplete = function (e) {
            // `resampledAudioBuffer` contains an AudioBuffer resampled at 16000Hz.
            // use resampled.getChannelData(x) to get an Float32Array for channel x.
            const resampledAudioBuffer = e.renderedBuffer;
            console.log(resampledAudioBuffer);
            // convert to  int16 buffer array
            console.log(floatTo16BitPCM(resampledAudioBuffer.getChannelData(0)))
        }
        offlineCtx.startRendering();
        source.start(0);
    };
};

navigator.mediaDevices.getUserMedia({audio: true, video: false})
    .then(handleSuccess);