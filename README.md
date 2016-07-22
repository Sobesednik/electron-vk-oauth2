# electron-vk-oauth2
A module which helps to complete vk.com OAuth2 process for standalone apps.

![Screenshot](/screenshot.png?raw=true "electron-vk-oauth2")

## Usage

To use this module, install it with `npm` and require in your electron app.
The `electron` dependency is not supplied with this module, so you have to
install it manually.

```bash
npm i --save electron-vk-oauth2
```

```javascript
const authenticateVK = require('electron-vk-oauth2');
authenticateVK({
    appId: '1234567',
    scope: 'photos',
    revoke: true,
}, {
    parent: this.win,
}).then((res) => {
    console.log('Access token: %s', res.accessToken);
    console.log('User id: %s', res.userId);
    console.log('Expires in: %s', res.expiresIn);
});
```


The module exports a function which returns a promise. The promise will be
fulfilled once the user has completed authorisation and granted all required
permissions. If the user closed the window without authorising the app, the
promise will be rejected. If the user denied permissions, or any other error
occured, the promise will be rejected.

### Options

The first argument is vk specific options:
- *appId*: your app id
- *scope*: required scope
- *display* [popup]: display type, one of the following: page, popup, mobile
- *revoke*: whether to ask users for permissions every time
- *authorizeUrl*: https://oauth.vk.com/authorize but you can override it
- *redirectUri*: https://oauth.vk.com/blank.html for standalone apps, but the
option to override it is available if the API changes in future.

See more info about vk auth flow for standalone apps
[here](https://new.vk.com/dev/implicit_flow_user).

### Window Options

The second argument is options for the window. By default, it will be open with
width of `655` and height of `430` and `null` parent, but you can specify these
parameters as properties of the object.

### Debug

This package uses `debug` module. To enable printing debugging information to
console, start your app with `DEBUG=electron-vk-oauth2` environment variable.

```
electron-vk-oauth2 open vk auth window https://oauth.vk.com/authorize?state=2397&response_type=token&client_id=1234567&scope=photos&display=popup&revoke=1&redirect_uri=https%3A%2F%2Foauth.vk.com%2Fblank.html +13ms

electron-vk-oauth2 Url { protocol: 'https:', slashes: true, auth: null, host: 'oauth.vk.com', port: null, hostname: 'oauth.vk.com', hash: '#error=access_denied&error_reason=user_denied&error_description=User%20denied%20your%20request&state=2397', search: null, query: null, pathname: '/blank.html', path: '/blank.html', href: 'https://oauth.vk.com/blank.html#error=access_denied&error_reason=user_denied&error_description=User%20denied%20your%20request&state=2397' } +2s

electron-vk-oauth2 { error: 'access_denied', error_reason: 'user_denied', error_description: 'User denied your request', state: '2397' } +13ms
```
