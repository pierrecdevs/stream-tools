import './style.css'
import VoiceCaptioning from './lib/voice-captioning.ts'
import OBSWebSocket from './lib/obs-ws.ts';
import SceneItem from './interfaces/SceneItem.ts';
import IrcLite from './lib/irc-lite.ts';

// Entrypoint
// @description wrapper function that returns all the objects
// @returns [OBSWebSocket, VoiceCaptioning]
const main = (): [OBSWebSocket, VoiceCaptioning, IrcLite] => {
  return [
    new OBSWebSocket(),
    new VoiceCaptioning(),
    new IrcLite(
      import.meta.env.VITE_TWITCH_USERNAME,
      import.meta.env.VITE_TWITCH_OAUTH_TOKEN
    ),
  ];
};


const [obsws, vc, chat]: [OBSWebSocket, VoiceCaptioning, IrcLite] = main();
let lastScene: SceneItem = null;

obsws.on('obsws-open', (m: any) => {
  console.log('open', m);
});

obsws.on('obsws-message', (m: any) => {
  console.log('message', m);
});

obsws.on('obsws-auth-required', (data: any) => {
  const { challenge, salt } = data;
  render(`OBS Requires authentication, authenticating using challenge ${challenge}`);
  const password = import.meta.env.VITE_OBS_WEBSOCKET_PASSWORD;
  obsws.authenticate(password, challenge, salt);
});

obsws.on('obsws-authenticated', () => {
  render('Authenticated. Start caption service');
  enableControls();
  const username = import.meta.env.VITE_TWITCH_USERNAME.toLowerCase();
  const pass = import.meta.env.VITE_TWITCH_OAUTH_TOKEN;
  const email = `${username}@${username}.tmi.twitch.tv`;
  chat.connect(
    username,
    username,
    email,
    pass,
  );
});

obsws.on('obsws-error', (e) => {
  render(`Error connecting to WS: ${JSON.stringify(e)}`);
});

obsws.on('obsws-scene-list', (data) => {
  const { responseData } = data
  const { currentPreviewSceneName, currentProgramSceneName, scenes } = responseData;
  const sceneList = document.getElementById('selSceneList') as HTMLSelectElement;

  do {
    sceneList.options.remove(0);
  } while (sceneList.options.length > 0);

  for (let scene: SceneItem of scenes) {
    sceneList.options.add(new Option(scene.sceneName, scene.sceneUuid));
    if (scene.sceneName.toLowerCase() === currentProgramSceneName.toLowerCase()) {
      console.log('FOUND', scene);
      lastScene = scene;
      sceneList.options.selectedIndex = scene.sceneIndex;
    }
  }

  sceneList.addEventListener('change', (e: any) => {
    console.log(e);
    obsws.setCurrentProgramSceneByUuid(e.currentTarget.value);
  });

});

chat.on('irc-connected', (e) => {
  console.log('IRC Connected', e);
  chat.sendCAP('twitch.tv/membership twitch.tv/tags twitch.tv/commands');
  chat.joinChannel('#fallenlearns');
});

chat.on('irc-data', (e) => {
  console.log('IRC DATA', e);
});
chat.on('irc-message', (e) => {
  console.log('IRC Message', e);
});

chat.on('irc-error', (e) => {
  console.warn('IRC Error', e);
});
chat.on('irc-close', (e) => {
  console.warn('IRC Closed', e);
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
  const caption = r.join('\n');

  const brbPattern = /(be right back|I'll be back)/i;
  const backPattern = /(I'm back|I have arrived)/i
  const privacyPattern = /(privacy please|hide screen)/i;
  const githubPattern = /(my github|my personal github|my work github)/i

  const patterns = [brbPattern, backPattern, privacyPattern, githubPattern];

  const found = patterns.filter(f => f.test(caption));
  console.log('FOUND', found);

  if (brbPattern.test(caption)) {
    obsws.setCurrentProgramSceneByName('scene.brb');
  } else if (privacyPattern.test(caption)) {
    render('SCREEN IS NOW HIDDEN...kind of.. work in progress');
  } else if (backPattern.test(caption)) {
    obsws.setCurrentProgramSceneByUuid(lastScene.sceneUuid);
  } else if (githubPattern.test(caption)) {
    const matches = caption.match(githubPattern);
    const match = matches![1];
    if (match.includes('personal')) {
      chat.sendChannelMessage(
        '#fallenlearns',
        'Check out my personal GitHub! https://github.com/afallenhope'
      );
    } else if (match.includes('work')) {
      chat.sendChannelMessage('#fallenlearns', 'Check out my work GitHub https://github.com/pierrecdevs');

    } else {
      chat.sendChannelMessage('#fallenlearns', 'Check out my github! https://github.com/afallenhope or https://github.com/pierrecdevs');
    }
  } else {
    render(caption);
    obsws.sendCaption(caption.trim());
  }
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

