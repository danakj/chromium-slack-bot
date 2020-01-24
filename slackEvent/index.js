// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const config = require('./config.json');
const { verifyRequestSignature } = require('@slack/events-api');
const { WebClient } = require('@slack/web-api');

const web = new WebClient(config.SLACK_BOT_TOKEN);


/**
 * Verify that the webhook request came from Slack.
 *
 * @param {object} req Cloud Function request object.
 * @param {string} req.headers Headers Slack SDK uses to authenticate request.
 * @param {string} req.rawBody Raw body of webhook request to check signature against.
 */
const verifyWebhook = req => {
  const signature = {
    signingSecret: config.SLACK_SECRET,
    requestSignature: req.headers['x-slack-signature'],
    requestTimestamp: req.headers['x-slack-request-timestamp'],
    body: req.rawBody,
  };

  if (!verifyRequestSignature(signature)) {
    const error = new Error('Invalid credentials');
    error.code = 401;
    throw error;
  }
};

/**
 * Receive an Events API message from Slack.
 *
 * @param {object} req Cloud Function request object.
 * @param {object} req.body The request payload.
 * @param {string} req.rawBody Raw request payload used to validate Slack's message signature.
 * @param {string} req.body.text The user's search query.
 * @param {object} res Cloud Function response object.
 */
exports.slackEvent = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      const error = new Error('Only POST requests are accepted');
      error.code = 405;
      throw error;
    }

    // This is only needed when adding the URL to the app's events API
    // to verify the URL is real.
    if (req.body.type == "url_verification") {
      res.send(req.body.challenge);
      return Promise.resolve();
    }

    console.debug("Running hook")
    console.debug(req.body);
    
    // Verify that this request came from Slack
    verifyWebhook(req);

    const body = req.body;

    // On team_join event, send a message to #slack-admins about who joined.
    if (body.type == "event_callback" &&
	body.event.type == "team_join") {
      console.info("team_join: userid " + body.event.user.id);

      const userInfo = await web.users.info({
	user: body.event.user.id
      });
      const userName = userInfo.user.name;
      const userEmail = userInfo.user.profile.email;

      console.info("team_join: username " + userName);
      console.info("team_join: email " + userEmail);

      web.chat.postMessage({
        channel: '#slack-admins',
        text: "A new user has joined! " + userEmail + " (" + userName + ")"
      });
      res.send("team_join handled");
      return Promise.resolve();
    }

    // Messages in channels.
    if (body.type == "event_callback" &&
	body.event.type == "message") {

      // For debugging, if !test is typed in #bots, then look up info about the
      // user who typed it and say hello back.
      if (body.event.channel == 'CGHGPLSF5' &&
	  body.event.text == "!test") {
	console.info("!test message: userid " + body.event.user);
      
	const userInfo = await web.users.info({
	  user: body.event.user
	});
	const userName = userInfo.user.name;
	const userEmail = userInfo.user.profile.email;
      
	console.info("!test message: username " + userName);
	console.info("!test message: email " + userEmail);

	const testPostToAdmins = false;
	if (testPostToAdmins) {
	  console.info("!test message: sending notice to #slack-admins");
	  web.chat.postMessage({
            channel: '#slack-admins',
            text: "A new user has joined! " + userEmail + " (" + userName + ")"
	  });
	}
	const testPostToBots = false;
	if (testPostToBots) {
	  console.info("!test message: sending notice to #bots");
	  web.chat.postMessage({
            channel: '#bots',
            text: 'Hello ' + userName
	  });
	}
      }

      res.send("message handled");
      return Promise.resolve();
    }

    console.error("Unexpected Slack event");
    console.error(body);
    const error = new Error('Unexpected Slack event');
    error.code = 405;
    throw error;
  } catch (err) {
    console.error(err);
    res.status(err.code || 500).send(err);
    return Promise.reject(err);
  }
};
