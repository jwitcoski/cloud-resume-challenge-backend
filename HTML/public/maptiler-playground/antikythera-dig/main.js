import { ns } from './ns.js';

import './ui/hud.js';
import './game/storage.js';
import './ui/folio.js';
import './ui/recap.js';
import './game/field-events-runner.js';
import './game/chapters.js';
import './ui/aegean-inset.js';
import './map/survey.js';
import './map/popups.js';
import './ui/modals.js';
import './game/dig.js';
import './map/pmtiles.js';
import './map/interactions.js';
import './map/layers.js';

ns.boot().catch((e) => ns.fail('Expedition grounded — journal failed to open.', e));

window.digFlyToTract = (...args) => ns.flyToTract(...args);
