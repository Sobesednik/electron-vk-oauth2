# electron-vk-oauth2
A module which helps to complete vk.com OAuth2 process for standalone apps.

[![npm version](https://badge.fury.io/js/electron-vk-oauth2.svg)](https://badge.fury.io/js/electron-vk-oauth2)

![Screenshot](/screenshot.png?raw=true "electron-vk-oauth2")

## Usage

To use this module, install it with `npm` and require in your electron app.
The `electron` dependency is not supplied with this module, so you have to
install it manually.

```bash
npm i --save electron-vk-oauth2
```

```javascript
const electron = require('electron');
const {app, BrowserWindow} = electron;
const authenticateVK = require('electron-vk-oauth2');

let win;
function createWindow() {
  win = new BrowserWindow({width: 800, height: 600});
  win.loadURL(`file://${__dirname}/index.html`);

  authenticateVK({
      appId: '1234567',
      scope: 'photos',
      revoke: true,
  }, {
      parent: win,
  }).then((res) => {
      console.log('Access token: %s', res.accessToken);
      console.log('User id: %s', res.userId);
      console.log('Expires in: %s', res.expiresIn);
      // now you can make requests to API using access token and pass data to
      // to the renderer process.
  }).catch((err) => {
      // E.g., user denied permissions, or user closed the window without
      // authorising the app.
      console.error(err);
  });
}

app.on('ready', createWindow);
```


The module exports a function which returns a promise. The promise will be
fulfilled once the user has completed authorisation and granted all required
permissions. If the user closed the window without authorising the app, the
promise will be rejected. If the user denied permissions, or any other error
occured, the promise will be rejected.

### Options

The first argument is vk specific options:
- *appId*: your app id
- *scope*: required scope (see [access permissions](https://new.vk.com/dev/permissions))
- *display* [popup]: display type, one of the following: page, popup, mobile
- *revoke*: whether to ask users for permissions every time
- *authorizeUrl*: https://oauth.vk.com/authorize but you can override it
- *redirectUri*: https://oauth.vk.com/blank.html for standalone apps, but the
option to override it is available if the API changes in future. Note that all
standalone apps are required to use this address, otherwise it's impossible to
complete authorisation.

See more info about vk auth flow for standalone apps
[here](https://new.vk.com/dev/implicit_flow_user).

### Window Options

The second argument is options for the window. By default, it will be open with
width of `655` and height of `430` and `null` parent, but you can specify these
parameters as properties of the object, or you can pass other options supported
by the [BrowserWindow](http://electron.atom.io/docs/api/browser-window/):

```javascript
const authenticateVK = require('electron-vk-oauth2');

authenticateVK({
    appId: 1234567,
    display: page,
}, {
    width: 1024,
    height: 720,
    parent: win, // main application window
    minimizable: false,
    maximizable: false,
    resizable: false,
});
```

### Debug

This package uses `debug` module. To enable printing debugging information to
console, start your app with `DEBUG=electron-vk-oauth2` environment variable.

```bash
electron-vk-oauth2 open vk auth window https://oauth.vk.com/authorize?state=301&response_type=token&client_id=1234567&scope=photos&display=popup&revoke=1&redirect_uri=https%3A%2F%2Foauth.vk.com%2Fblank.html +13ms
# user logged in
electron-vk-oauth2 Redirect to https://oauth.vk.com/authorize?client_id=5551949&redirect_uri=https%3A%2F%2Foauth.vk.com%2Fblank.html&response_type=token&scope=4&v=&state=301&revoke=1&display=popup&__q_hash=xyz +5s
# user denied permissions
electron-vk-oauth2 Redirect to https://oauth.vk.com/blank.html#error=access_denied&error_reason=user_denied&error_description=User denied your request&state=301 +11s
electron-vk-oauth2 { error: 'access_denied', error_reason: 'user_denied', error_description: 'User denied your request', state: '301' } +1ms
# or user allowed permissions
electron-vk-oauth2 Redirect to https://oauth.vk.com/blank.html#access_token=xyz&expires_in=86400&user_id=123&state=1462 +1s
electron-vk-oauth2 { access_token: 'xyz', expires_in: '86400', user_id: '123', state: '1462' } +1ms
```
