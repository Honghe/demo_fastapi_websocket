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