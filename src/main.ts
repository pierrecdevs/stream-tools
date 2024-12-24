import './style.css'
import VoiceCaptioning from './lib/voice-captioning.ts'
import OBSWebSocket from './lib/obs-ws.ts';

// Entrypoint
// @description wrapper function that returns all the objects
// @returns [OBSWebSocket, VoiceCaptioning]
const main = (): [OBSWebSocket, VoiceCaptioning] => {
  return [
    new OBSWebSocket(),
    new VoiceCaptioning(),
  ];
};


const [obsws, vc]: [OBSWebSocket, VoiceCaptioning] = main();

obsws.on('obsws-open', (m: any) => {
  console.log('open', m);
});

obsws.on('obsws-message', (m: any) => {
  console.log('message', m);
});

obsws.on('obsws-auth-required', (data: any) => {
  const { challenge, salt } = data;
  render(`OBS Requires authentication, authenticating using challenge ${challenge}`);
  obsws.authenticate(import.meta.env.VITE_OBS_WEBSOCKET_PASSWORD, challenge, salt);
});

obsws.on('obsws-authenticated', () => {
  render('Authenticated. Start caption service');
  enableControls();
});

obsws.connect(`ws://${import.meta.env.VITE_OBS_WEBSOCKET_HOST}:${import.meta.env.VITE_OBS_WEBSOCKET_PORT}`);

vc.initialize();

vc.onStart = (e: Event) => {
  console.log('vc', e);
};

vc.on('vc-start', () => {
  render('VoiceCaptioning has started...');
  console.log('vc has started');
})

vc.on('vc-result', (r: string[]) => {
  render(r.join('\n'));
});


/**
 * @name startCaptioning()
 * @method
 * @description Helper function to toggle the UI and start VoiceCaptioning
 */
const startCaptioning = () => {
  const btnStartCaptioning = document.getElementById('btnStartCaptioning');
  const btnStopCaptioning = document.getElementById('btnStopCaptioning');

  btnStartCaptioning?.setAttribute('disabled', 'disabled');
  btnStopCaptioning?.removeAttribute('disabled');

  vc.start();
};

/**
 * @name stopCaptioning()
 * @method
 * @description Helper function to toggle the UI and stop VoiceCaptioning
 */
const stopCaptioning = () => {
  const btnStartCaptioning = document.getElementById('btnStartCaptioning');
  const btnStopCaptioning = document.getElementById('btnStopCaptioning');

  btnStopCaptioning?.setAttribute('disabled', 'disabled');
  btnStartCaptioning?.removeAttribute('disabled');

  vc.stop();
};

const populateSceneList = () => {
  obsws.getSceneList();

};

/**
 * @name enableControls()
 * @method
 * @description Function to enable the 'Start Captioning' button
 */
const enableControls = () => {
  const btnStartCaptioning = document.getElementById('btnStartCaptioning');
  const btnStopCaptioning = document.getElementById('btnStopCaptioning');
  const btnGetSceneList = document.getElementById('btnGetSceneList');

  btnStartCaptioning?.addEventListener('click', startCaptioning);
  btnStopCaptioning?.addEventListener('click', stopCaptioning);
  btnGetSceneList?.addEventListener('click', populateSceneList);
  btnStartCaptioning?.removeAttribute('disabled');
  btnGetSceneList?.removeAttribute('disabled');
};

/**
 * @name render()
 * @description Used to render text in the caption header element
 */
const render = (message: string) => {
  const caption = document.getElementById('caption') as HTMLDivElement;
  caption.innerText = message;
};

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="card">
    <button id="btnGetSceneList" class="btn btn-primary" disabled="disabled">Get Scene List</button>
    <div class="selectdiv">
      <label for="selSceneList">
        <select id="selSceneList">
            <option disabled selected>Select a Scene</option>
        </select>
      </label>
    </div>
</div>
  <div>
    <button id="btnStartCaptioning" class="btn btn-success" disabled=disabled>Start Captioning</button>
    <button id="btnStopCaptioning" class="btn btn-error" disabled="disabled">Stop</button>

    <div class="card">
      <h2 id="caption"></h2>
    </div>

  </div>
`

