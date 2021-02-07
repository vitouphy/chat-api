'use strict';

const
  express = require('express'),
  bodyParser = require('body-parser'),
  request = require('request'),
  Knex = require('knex'),
  util = require('util'),
  querystring = require('querystring'),
  app = express().use(bodyParser.json());

// Send the message back to Facebook
function callSendAPI(sender_psid, response) {
  let request_body = {
      "recipient": {
          "id": sender_psid
      },
      "message": response
  }

  // Send the HTTP request to the Messenger Platform
  request({
      "uri": "https://graph.facebook.com/v2.6/me/messages",
      "qs": { "access_token": process.env.PAGE_ACCESS_TOKEN },
      "method": "POST",
      "json": request_body
  }, (err, res, body) => {
      if (!err) {
          console.log('message sent!')
      } else {
          console.error("Unable to send message:" + err);
      }
  });
}

// Call Chatbot API
async function callBotAPI(context) {
    let form = {
        'context': context
    };
    let formData = querystring.stringify(form);
    var contentLength = formData.length;
    var request_header = {
        headers: {
            'Content-Length': contentLength,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        uri: process.env.BOT_URL,
        body: formData,
        method: 'POST'
    };

    const requestPromise = util.promisify(request);
    const res = await requestPromise(request_header);
    let content = JSON.parse(res['body']);
    return content

}

// Handle the message chat from the user
async function handleMessage(sender_psid, received_message) {

    let response = {}
    if (received_message.text) {
        let content = await callBotAPI(received_message.text);
        response['text'] = content['response']
    }
    else {
        response['text'] = 'Right now, I only understand text.'
    }

    callSendAPI(sender_psid, response);
    // TODO: Add proper user ID and bot ID
    insertToDb(1, 1, received_message.text, response.text);
}

// Postback is when user press "YES" or "NO" to the provided buttons
function handlePostback(sender_psid, received_postback) {
    let response;
    // Get the payload for the postback
    let payload = received_postback.payload;

    // Set the response based on the postback payload
    response = { "text": "What is this?" }
    if (payload === 'yes') {
      response = { "text": "Thanks!" }
    } else if (payload === 'no') {
      response = { "text": "Oops, try sending another image." }
    }
    // Send the message to acknowledge the postback
    callSendAPI(sender_psid, response);
}

// Connnect to the Database
function connect() {

    const config = {
      user: process.env.DB_USER, // e.g. 'my-user'
      password: process.env.DB_PASSWORD, // e.g. 'my-user-password'
      database: process.env.DB_DBNAME, // e.g. 'my-database'
      host: process.env.DB_HOST,
    };

    // Establish a connection to the database
    const knex = Knex({
      client: 'mysql',
      connection: config,
    });

    return knex

};

// Insert the context-reply to the DB
function insertToDb(userId, botId, context, response) {

    knex('chats').insert([
        {
            users_idusers: userId,
            text: context,
            is_human: true
        },
        {
            users_idusers: userId,
            bots_idbots: botId,
            text: response,
            is_human: false
        }
    ])
    .then((status) => {
        console.log(status);
    }).catch((error)=>{
        console.log(error)
    });
}


app.get('/', (req, res) => {
    res.send('Hello from App Engine!');
});

// This is the entry point for the webhook
app.post('/webhook', (req, res) => {

    let body = req.body;
    // Checks this is an event from a page subscription
    if (body.object === 'page') {
      // Iterates over each entry - there may be multiple if batched
      body.entry.forEach(function(entry) {

        // Gets the message. entry.messaging is an array, but
        // will only ever contain one message, so we get index 0
        let webhook_event = entry.messaging[0];

        // Get the sender PSID
        let sender_psid = webhook_event.sender.id;
        console.log(sender_psid);

        // Check if the event is a message or postback and
        // pass the event to the appropriate handler function
        if (webhook_event.message) {
            handleMessage(sender_psid, webhook_event.message);
        } else if (received_message.attachments) {
            ;
        } else if (webhook_event.postback) {
            ;
            // handlePostback(sender_psid, webhook_event.postback);
        }
      });
      // Returns a '200 OK' response to all requests
      res.status(200).send('EVENT_RECEIVED');
    } else {
      // Returns a '404 Not Found' if event is not from a page subscription
      res.sendStatus(404);
    }

});

// GET Webhoot for Facebook to verify our app
app.get('/webhook', (req, res) => {

    // Your verify token. Should be a random string.
    let VERIFY_TOKEN = "apple"

    // Parse the query params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    // Checks if a token and mode is in the query string of the request
    if (mode && token) {

      // Checks the mode and token sent is correct
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {

        // Responds with the challenge token from the request
        console.log('WEBHOOK_VERIFIED');
        res.status(200).send(challenge);

      } else {
        // Responds with '403 Forbidden' if verify tokens do not match
        res.sendStatus(403);
      }
    }
});

// Sets server port and logs message on success
const knex = connect();
let port = process.env.PORT || 1337

console.log('---------- init --------------')
app.listen(port, () => console.log(`webhook is listening at port ${port}`));
