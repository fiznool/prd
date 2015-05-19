'use strict';

/**
 * Private Repository Deployment.
 *
 * These scripts are used to connect to a private
 * git repo via SSH, for deployment purposes.
 *
 * This is very useful for situations where you want to
 * deploy a node module to an external server, but
 * do not want to provide read/write access, or use
 * private npm modules.
 */

var fs = require('fs'),
    path = require('path');

var SSH_HOME = '/home/fiznool/.ssh',
    SSH_CONFIG_FILE = path.join(SSH_HOME, 'config'),
    SSH_KEY_FILE = path.join(SSH_HOME, 'deploy_key');

var DEFAULT_ENV = 'GIT_SSH_KEY';

/**
 * Generates an SSH config file for connections
 * if a `GIT_SSH_KEY` config var exists.
 */
exports.setup = function setup(options) {
  options = options || {};

  var env = options.env || DEFAULT_ENV;
  var hosts = options.hosts || ['github.com', 'bitbucket.org'];

  if(env in process.env) {
    console.log('Detected SSH key for git. Adding SSH config.');

    // Ensure we have an SSH folder
    try {
      fs.mkdirSync(SSH_HOME, 448);  // 448 === 0700
    } catch(e) {
      // Ignore if it already exists.
      if(e.code !== 'EEXIST') {
        throw e;
      }
    }

    // Take the base-64 encoded private key,
    // decode, and put into a key file.
    fs.writeFileSync(
      SSH_KEY_FILE,
      new Buffer(process.env[env], 'base64'),
      { mode: 384 });   // 384 === 0600

    // Setup the ssh config file.
    var config = hosts.map(function(host) {
      return 'Host '+host+'\n' +
             '  IdentityFile '+SSH_KEY_FILE+'\n' +
             '  IdentitiesOnly yes\n' +
             '  UserKnownHostsFile=/dev/null\n' +
             '  StrictHostKeyChecking no\n';
    }).join('\n');

    fs.writeFileSync(
      path.join(SSH_CONFIG_FILE),
      config,
      { mode: 384 });   // 384 === 0600
  }
};

/**
 * Cleans up any SSH config created by `setup`.
 */
exports.cleanup = function cleanup(options) {
  var env = (options && options.env) || DEFAULT_ENV;

  if(env in process.env) {
    console.log('Cleaning up SSH config');

    // Remove the files we created
    [SSH_CONFIG_FILE, SSH_KEY_FILE].forEach(function(file) {
      try { fs.unlinkSync(file); } catch(e) {}
    });

    // Clear sensitive private key from the environment
    delete process.env[env];
  }
};
