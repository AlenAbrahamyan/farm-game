import { Howl, Howler } from "howler";

const _sounds = {
  bg: new Howl({
    src: ["/assets/sounds/bg.mp3"],
    loop: true,
    volume: 0.3,
  }),
  click: new Howl({
    src: ["/assets/sounds/click_003.mp3"],
    volume: 0.6,
  }),
  chicken: new Howl({
    src: ["/assets/sounds/chicken.mp3"],
    volume: 0.7,
  }),
  cow: new Howl({
    src: ["/assets/sounds/cow.mp3"],
    volume: 0.7,
  }),
  popup: new Howl({
    src: ["/assets/sounds/popup_chest.mp3"],
    volume: 0.8,
  }),
};

export function playBg()      { if (!_sounds.bg.playing()) _sounds.bg.play(); }
export function stopBg()      { _sounds.bg.stop(); }
export function playClick()   { _sounds.click.play(); }
export function playChicken() { _sounds.chicken.play(); }
export function playCow()     { _sounds.cow.play(); }
export function playPopup()   { _sounds.popup.play(); }

export function setMasterVolume(v) { Howler.volume(v); }

let _muted = localStorage.getItem("farm_muted") === "1";
if (_muted) Howler.mute(true);

export function isMuted() { return _muted; }
export function toggleMute() {
  _muted = !_muted;
  Howler.mute(_muted);
  localStorage.setItem("farm_muted", _muted ? "1" : "0");
  return _muted;
}
