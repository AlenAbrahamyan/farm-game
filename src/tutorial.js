export const STEPS = ["cell", "corn", "grow", "harvest", "car_wait", "sell", "done"];

let _step = "done";
let _arrowEl = null;
let _hintEl = null;
let _arrowVisible = false;

export function initTutorial() {
  _step = "cell";  

  _arrowEl = document.createElement("div");
  _arrowEl.id = "tut-arrow";
  _arrowEl.innerHTML = `<div class="tut-arrow-label"></div><div class="tut-arrow-icon">▼</div>`;
  document.body.appendChild(_arrowEl);

  _hintEl = document.createElement("div");
  _hintEl.id = "tut-hint";
  document.body.appendChild(_hintEl);
}

export function tutorialStep() { return _step; }
export function tutorialActive() { return _step !== "done"; }

export function advanceTutorial(toStep) {
  if (_step === "done") return;
  const ci = STEPS.indexOf(_step);
  const ni = STEPS.indexOf(toStep);
  if (ni <= ci) return;
  _step = toStep;
  if (_step === "done") _dismiss();
}

export function showArrow(x, y, label) {
  if (!_arrowEl) return;
  _arrowEl.querySelector(".tut-arrow-label").textContent = label;
  _arrowEl.style.left = x + "px";
  _arrowEl.style.top = y + "px";
  if (!_arrowVisible) {
    _arrowEl.classList.add("visible");
    _arrowVisible = true;
  }
  hideHint();
}

export function hideArrow() {
  if (!_arrowEl || !_arrowVisible) return;
  _arrowEl.classList.remove("visible");
  _arrowVisible = false;
}

export function showHint(text) {
  if (!_hintEl) return;
  if (_hintEl.textContent !== text) _hintEl.textContent = text;
  _hintEl.classList.add("visible");
  hideArrow();
}

export function hideHint() {
  _hintEl?.classList.remove("visible");
}

function _dismiss() {
  if (_arrowEl) {
    _arrowEl.style.opacity = "0";
    setTimeout(() => _arrowEl?.remove(), 500);
    _arrowEl = null;
  }
  if (_hintEl) {
    _hintEl.style.opacity = "0";
    setTimeout(() => _hintEl?.remove(), 500);
    _hintEl = null;
  }
}
