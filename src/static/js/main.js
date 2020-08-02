var ws = null;
var audiotrack = null;
var source = null;
var processor = null;

var audioElement = document.getElementById('audio')
function connect(event) {
    var itemId = document.getElementById("itemId")
    var token = document.getElementById("token")
    ws = new WebSocket("wss://" + window.location.hostname + ":8000/items/" + itemId.value + "/ws?token=" + token.value);
    ws.onmessage = function (event) {
        var messages = document.getElementById('messages')
        var message = document.createElement('li')
        var content = document.createTextNode(event.data)
        message.appendChild(content)
        messages.appendChild(message)
    };
    ws.onerror = (ev => {
        alert(e)
    });
    event.preventDefault();
    console.log('success connect ws');
}

function sendMessage(event) {
    var input = document.getElementById("messageText")
    ws.send(input.value)
    input.value = ''
    event.preventDefault()
}

counter = 0
const handleSuccess = function (stream) {
    audioElement.srcObject = stream
    const context = new AudioContext();
    source = context.createMediaStreamSource(stream);
    processor = context.createScriptProcessor(2048, 1, 1);
    audiotrack = stream.getAudioTracks()[0];

    source.connect(processor);
    processor.connect(context.destination);

    processor.onaudioprocess = function (e) {
        console.log(new Date().getTime() / 1000)
        console.log('counter ' + counter)
        counter++
        audioElement.play()
        // Do something with the data, e.g. convert it to WAV

        let sourceAudioBuffer = e.inputBuffer;
        console.log(sourceAudioBuffer);

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
            let data = floatTo16BitPCM(resampledAudioBuffer.getChannelData(0));
            console.log(data)
            ws.send(data);
        }
        offlineCtx.startRendering();
        source.start(0);
    };
};


document.getElementById('stop').addEventListener('click', function () {
    if (null != audiotrack) {
        console.log('audiotrack.stop');
        audiotrack.stop();
        audiotrack = null;
    }
    if (null != source) {
        source.disconnect();
    }
    if (null != processor) {
        processor.disconnect();
    }
    console.log('stop time ' + new Date().getTime() / 1000)
    console.log('stop');
});

document.getElementById('record').addEventListener('click', function () {
    navigator.mediaDevices.getUserMedia({
        audio: {channelCount: 1, sampleRate: 44100},
        video: false
    })
        .then(handleSuccess);
    console.log('record time ' + new Date().getTime() / 1000)
    console.log('record');
});

document.getElementById('disconnect').addEventListener('click', function () {
    if (null != ws) {
        ws.close();
    }
    console.log('disconnect');
});