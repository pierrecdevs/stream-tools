import './style.css';
import VoiceCaptioning from './lib/voice-captioning';
import OBSWebSocket from './lib/obs-ws';
import SceneItem from './interfaces/SceneItem';
import IrcLite from './lib/irc-lite';
import TTS from './lib/tts';
import CommandParser from './lib/command-parser';
import LifxClient from './lib/lifx-client';
import { LifxBulbState } from './interfaces/LifxBulb';
import OllamaClient, { OllamaRole } from './lib/ollama-client';
import SpotifyClient, { SpotifyConfig } from './lib/spotify-client';

// Entrypoint
// @description wrapper function that returns all the objects
// @returns [OBSWebSocket, VoiceCaptioning, TTS, IrcLite]
const main = (): [
  CommandParser,
  OBSWebSocket,
  VoiceCaptioning,
  TTS,
  LifxClient,
  IrcLite,
  SpotifyClient,
] => {
  return [
    new CommandParser(),
    new OBSWebSocket(),
    new VoiceCaptioning(),
    new TTS(),
    new LifxClient(import.meta.env.VITE_LIFX_OAUTH_TOKEN),
    new IrcLite(),
    new SpotifyClient({
      client_id: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
      client_secret: import.meta.env.VITE_SPOTIFY_CLIENT_SECRET,
      redirect_uri: import.meta.env.VITE_SPOTIFY_REDIRECT_URI,
      oauth_token: import.meta.env.VITE_SPOTIFY_TOKEN,
      scope: import.meta.env.VITE_SPOTIFY_SCOPE,
      base_url: 'https://api.spotify.com',
      version: 'v1',
    } as SpotifyConfig),
  ];
};

const [commandParser, obsws, vc, tts, lifx, chat, spotify]: [
  CommandParser,
  OBSWebSocket,
  VoiceCaptioning,
  TTS,
  LifxClient,
  IrcLite,
  SpotifyClient,
] = main();

let lastScene: SceneItem | null = null;
let privacySource: number | string = '';
let reconnectTimer: number | NodeJS.Timeout;

try {
  commandParser.load('commands.json');
} catch (ex) {
  tts.speak('Your stuff is broken, could not load commands dot jason');
}

obsws.on('obsws-open', (m: any) => {
  console.log('open', m);
});

obsws.on('obsws-message', (m: any) => {
  console.log('message', m);
});

obsws.on('obsws-auth-required', (data: any) => {
  const { challenge, salt } = data;
  render(
    `OBS Requires authentication, authenticating using challenge ${challenge}`,
  );
  const password = import.meta.env.VITE_OBS_WEBSOCKET_PASSWORD;
  obsws.authenticate(password, challenge, salt);
});

obsws.on('obsws-authenticated', async () => {
  render('Authenticated. Start caption service');
  //tts.speak('Authenticated and ready to go.');
  const light = await lifx.randomLight();

  if (light) {
    lifx.setState(light, {
      power: 'on',
      color: lifx.randomColor(),
    } as LifxBulbState);
    console.log(light);
  }
  enableControls();

  const username = import.meta.env.VITE_TWITCH_USERNAME.toLowerCase();
  const pass = import.meta.env.VITE_TWITCH_OAUTH_TOKEN;
  const hostname = `${username}.tmi.twitch.tv`;
  chat.connect(username, username, hostname, pass);

  if (localStorage.getItem('at')) {
    const b64at = localStorage.getItem('at');
    const plain = atob(b64at);
    spotify.setToken(plain);
    const profile = await spotify.getProfile();
    console.log('Spotify', profile);
  } else {
    if (!window.location.search?.includes('code')) {
      spotify.openAuthorizationUrl();
    } else {
      const code = window.location.search.substring(6);
      window.history.pushState({}, '', '/');
      const { access_token, refresh_token } =
        await spotify.getAccessToken(code);

      localStorage.setItem('rt', Buffer.from(refresh_token).toString('base64'));
      localStorage.setItem('at', Buffer.from(access_token).toString('base64'));
    }
  }
  console.log('Url', window.location);
});

obsws.on('obsws-error', (e) => {
  if (reconnectTimer > 0) {
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      obsws.connect(
        `ws://${import.meta.env.VITE_OBS_WEBSOCKET_HOST}:${import.meta.env.VITE_OBS_WEBSOCKET_PORT}`,
      );
    }, 3000);
  }
  render(`Error connecting to WS: ${JSON.stringify(e)}`);
});

obsws.on('obsws-scene-list', (data) => {
  const { responseData } = data;
  const { currentPreviewSceneName, currentProgramSceneName, scenes } =
    responseData;
  const sceneList = document.getElementById(
    'selSceneList',
  ) as HTMLSelectElement;

  // implemented a "clear" function
  do {
    sceneList.options.remove(0);
  } while (sceneList.options.length > 0);

  for (let scene of scenes) {
    sceneList.options.add(new Option(scene.sceneName, scene.sceneUuid));
    if (
      scene.sceneName.toLowerCase() === currentProgramSceneName.toLowerCase()
    ) {
      console.log('Current Program Scene', scene);
      lastScene = scene;
      sceneList.options.selectedIndex = scene.sceneIndex;
      obsws.getSceneItemId('Screens', 'Privacy Screen');
    }
  }

  sceneList.addEventListener('change', (e: any) => {
    console.log(e);
    obsws.setCurrentProgramSceneByUuid(e.currentTarget.value);
  });
});

obsws.on('obsws-scene-item-list', (e: any) => {
  console.log('Scene Item List', e);
});

obsws.on('obsws-scene-item-id', (e: any) => {
  const { responseData } = e;
  if (responseData.sceneItemId) {
    privacySource = responseData.sceneItemId;
    console.log('found privacy screen', e);
  } else {
  }
});

chat.on('irc-connected', (e) => {
  console.log('IRC Connected', e);
  chat.sendCAP('twitch.tv/membership twitch.tv/tags twitch.tv/commands');
  chat.joinChannel(`#${import.meta.env.VITE_TWITCH_USERNAME}`);
  //tts.speak('Connected to #FallenLearns');
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

chat.on('irc-channel-join', (e) => {
  console.log(`${e.nick} has joined ${e.channel}`);
});

obsws.connect(
  `ws://${import.meta.env.VITE_OBS_WEBSOCKET_HOST}:${import.meta.env.VITE_OBS_WEBSOCKET_PORT}`,
);

vc.initialize();

vc.onStart = (e: Event) => {
  console.log('vc', e);
};

vc.on('vc-start', () => {
  render('VoiceCaptioning has started...');
  console.log('vc has started');
});

vc.on('vc-result', async (r: string[]) => {
  const caption = r.join('\n');

  if (!caption) {
    return;
  }

  const foundCommand = commandParser.parseCommand(
    caption,
    ['$privacySource', '$lastSceneUuid', '$true', '$false', '$song'],
    [privacySource, lastScene?.sceneUuid, true, false, spotify.getNowPlaying],
  );

  render(caption);
  obsws.sendCaption(caption.trim());

  if (null === foundCommand) {
    return;
  }

  switch (foundCommand.action) {
    case 'speak':
      if ('<stop>' === foundCommand.response.trim()) {
        tts.stop();
        return;
      }

      tts.speak(foundCommand.response);
      break;
    case 'chat':
      chat.sendChannelMessage(
        `#${import.meta.env.VITE_TWITCH_USERNAME}`,
        foundCommand.response,
      );
      break;
    case 'obs':
      try {
        const { command, args } = foundCommand;
        if (command && typeof obsws[command] === 'function') {
          obsws[command](...args);
        }
      } catch (ex: unknown) {
        const error = ex as Error;
        console.warn(`Error parsing OBS command`, error.message);
      }
      break;
    case 'ai':
      try {
        const selModelList: HTMLSelectElement | null =
          document.getElementById('selModelList');

        //const r = await OllamaClient.generate(foundCommand.response);
        const model =
          selModelList && selModelList.selectedIndex > -1
            ? selModelList.options[selModelList.selectedIndex].value.trim()
            : 'llama3.2';
        const r = await OllamaClient.chat(
          OllamaRole.User,
          foundCommand.response,
          //'llama3.2'
        );
        if (r instanceof Error) {
          return;
        }

        tts.speak(r.message.content);
      } catch (ex: unknown) {
        const error = ex as Error;
        console.warn(`Error parsing AI response`, error.message);
      }
      break;
    case 'spotify':
      const { command, args } = foundCommand;
      if (command && typeof spotify[command] === 'function') {
        console.log('Spotify', command);
        const result = await spotify[command](...args);

        if ('getCurrentSong' === command) {
          const { artists, track, url } = result;
          console.log('getCurrentSong', result);
          chat.sendChannelMessage(
            `#${import.meta.env.VITE_TWITCH_USERNAME}`,
            `Currently listening to: ${track} by ${artists[0].name}.\nCheck it out at ${url}`,
          );
        }
      } else {
        console.log('Unknown call on spotify', command, args);
      }
      break;
    default:
      console.log('Unknown Action', foundCommand.action);
  }
});

/**
 * @name startCaptioning()k
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

/**
 * @async
 * @name askAI()
 * @method
 * @description Function to call our local LLAMA
 */
const askAI = async () => {
  const prompt: HTMLTextAreaElement = document.getElementById('prompt');
  const out: HTMLDivElement = document.getElementById('ai-out');
  const selModelList: HTMLSelectElement =
    document.getElementById('selModelList');

  try {
    const model =
      selModelList?.options[selModelList?.options.selectedIndex].value;
    const r = await OllamaClient.chat(
      OllamaRole.User,
      prompt.value.trim(),
      //'llama3.2'
      model,
    );
    if (r instanceof Error) {
      return;
    }

    out!.innerHTML = r.message.content.replace(/\r?\n/g, '<br>');
  } catch (ex: unknown) {
    const error = ex as Error;
    console.warn(`Error parsing AI response`, error.message);
  }
};

/**
 * @name resetPrompt()
 * @method
 * @description Function to reset the textarea and AI prompt response
 */
const resetPrompt = () => {
  const prompt: HTMLTextAreaElement = document.getElementById('prompt');
  const out: HTMLDivElement = document.getElementById('ai-out');
  out.textContent = '';
  prompt.value = '';
};

/**
 * @name populateSceneList()
 * @method
 * @description Function to use OBSWS and get the scenes
 */
const populateSceneList = () => {
  obsws.getSceneList();
};

/**
 * @name populateModelList()
 * @method
 * @description Function to populate the LLAMA select box.
 */
const populateModelList = async () => {
  const selModelList: HTMLSelectElement =
    document.getElementById('selModelList');

  try {
    const { models } = await OllamaClient.getModels();

    [...models].forEach((m) => {
      selModelList.options.add(new Option(m.name, m.name));
    });

    if (selModelList.options.length > 0) {
      selModelList.selectedIndex = 1;
    }
  } catch (ex: unknown) {}
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
  const btnAskAI = document.getElementById('btnAskAI');
  const btnReset = document.getElementById('btnReset');

  btnStartCaptioning?.addEventListener('click', startCaptioning);
  btnStopCaptioning?.addEventListener('click', stopCaptioning);
  btnGetSceneList?.addEventListener('click', populateSceneList);
  btnAskAI?.addEventListener('click', askAI);
  btnReset?.addEventListener('click', resetPrompt);

  btnStartCaptioning?.removeAttribute('disabled');
  btnGetSceneList?.removeAttribute('disabled');
  btnAskAI?.removeAttribute('disabled');
  btnReset?.removeAttribute('disabled');

  populateModelList();
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
<div id="controls">
  <div class="row">
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
    <div class="card">
      <button id="btnStartCaptioning" class="btn btn-success" disabled=disabled>Start Captioning</button>
      <button id="btnStopCaptioning" class="btn btn-error" disabled="disabled">Stop</button>
    </div>
  </div>
  <div class="col">
    <div class="card">
        <h2>AI Prompt</h2>
        <textarea id="prompt" cols="30" row="10" placeholder="Ask your question"></textarea> 
        <div class="row">
          <div class="selectdiv">
            <label for="selModelList">
              <select id="selModelList">
                  <option disabled selected>Select a model</option>
              </select>
            </label>
        </div>
      </div>
      <div class="row">
          <button id="btnAskAI" class="btn btn-success" disabled=disabled>Ask AI</button>
          <button id="btnReset" class="btn btn-error" disabled="disabled">Reset</button>
      </div>
      <div id="ai-out">results will be printed here...</div>
    </div>
  </div>
</div>
<div id="captionator">
  <div class="card">
    <h2 id="caption"></h2>
  </div>
</div>
`;
