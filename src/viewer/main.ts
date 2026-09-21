import Phaser from 'phaser';
import { ViewerScene, BrotatoAction } from './ViewerScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 640,
  height: 640,
  parent: 'canvas-wrapper',
  backgroundColor: '#121520',
  scene: [ViewerScene],
};

new Phaser.Game(config);

window.addEventListener('DOMContentLoaded', () => {
  const getScene = (): ViewerScene | undefined => {
    return (window as any).__viewer;
  };

  // 1. Play / Pause
  const btnPlayPause = document.getElementById('btn-play-pause') as HTMLButtonElement;
  let isPlaying = true;
  btnPlayPause?.addEventListener('click', () => {
    isPlaying = !isPlaying;
    getScene()?.setPlay(isPlaying);
    btnPlayPause.innerText = isPlaying ? '⏸ 暂停' : '▶ 播放';
    btnPlayPause.classList.toggle('active', isPlaying);
  });

  // 2. Action buttons
  const actions: Array<{ id: string; act: BrotatoAction }> = [
    { id: 'btn-act-idle', act: 'idle' },
    { id: 'btn-act-walk', act: 'walk' },
    { id: 'btn-act-atk1', act: 'attack1' },
    { id: 'btn-act-atk2', act: 'attack2' },
    { id: 'btn-act-atk3', act: 'attack3' },
    { id: 'btn-act-dodge', act: 'dodge' },
    { id: 'btn-act-hurt', act: 'hurt' },
  ];

  actions.forEach(({ id, act }) => {
    const btn = document.getElementById(id);
    btn?.addEventListener('click', () => {
      actions.forEach((a) => document.getElementById(a.id)?.classList.remove('active'));
      btn.classList.add('active');
      getScene()?.setAction(act);
    });
  });

  // 3. Facing buttons
  const btnRight = document.getElementById('btn-facing-right');
  const btnLeft = document.getElementById('btn-facing-left');
  btnRight?.addEventListener('click', () => {
    btnRight.classList.add('active');
    btnLeft?.classList.remove('active');
    getScene()?.setFacing('right');
  });
  btnLeft?.addEventListener('click', () => {
    btnLeft.classList.add('active');
    btnRight?.classList.remove('active');
    getScene()?.setFacing('left');
  });

  // 4. Speed slider
  const sliderSpeed = document.getElementById('slider-speed') as HTMLInputElement;
  const speedVal = document.getElementById('speed-val');
  sliderSpeed?.addEventListener('input', () => {
    const val = parseFloat(sliderSpeed.value);
    if (speedVal) speedVal.innerText = `${val.toFixed(2)}x`;
    const scene = getScene();
    if (scene) scene.params.speed = val;
  });

  // 5. Dynamics Sliders
  const sliderTilt = document.getElementById('slider-waddle-tilt') as HTMLInputElement;
  const tiltVal = document.getElementById('waddle-tilt-val');
  sliderTilt?.addEventListener('input', () => {
    const val = parseFloat(sliderTilt.value);
    if (tiltVal) tiltVal.innerText = `${val}°`;
    const scene = getScene();
    if (scene) scene.params.waddleTilt = val;
  });

  const sliderBounce = document.getElementById('slider-bounce-height') as HTMLInputElement;
  const bounceVal = document.getElementById('bounce-height-val');
  sliderBounce?.addEventListener('input', () => {
    const val = parseFloat(sliderBounce.value);
    if (bounceVal) bounceVal.innerText = `${val}px`;
    const scene = getScene();
    if (scene) scene.params.bounceHeight = val;
  });

  const sliderSquash = document.getElementById('slider-squash-amount') as HTMLInputElement;
  const squashVal = document.getElementById('squash-amount-val');
  sliderSquash?.addEventListener('input', () => {
    const val = parseFloat(sliderSquash.value);
    if (squashVal) squashVal.innerText = `${Math.round(val * 100)}%`;
    const scene = getScene();
    if (scene) scene.params.squashAmount = val;
  });

  const sliderBreath = document.getElementById('slider-breath-amount') as HTMLInputElement;
  const breathVal = document.getElementById('breath-amount-val');
  sliderBreath?.addEventListener('input', () => {
    const val = parseFloat(sliderBreath.value);
    if (breathVal) breathVal.innerText = `${Math.round(val * 100)}%`;
    const scene = getScene();
    if (scene) scene.params.breathAmount = val;
  });

  // 6. Zoom buttons
  const zoomBtns: Record<string, number> = {
    'btn-zoom-1': 1.0,
    'btn-zoom-2': 2.0,
    'btn-zoom-4': 4.0,
  };
  Object.entries(zoomBtns).forEach(([btnId, zoom]) => {
    const btn = document.getElementById(btnId);
    btn?.addEventListener('click', () => {
      Object.keys(zoomBtns).forEach((id) => document.getElementById(id)?.classList.remove('active'));
      btn.classList.add('active');
      getScene()?.setZoom(zoom);
    });
  });

  // 7. Display toggles
  document.getElementById('chk-ground')?.addEventListener('change', (e) => {
    getScene()?.setShowGround((e.target as HTMLInputElement).checked);
  });
  document.getElementById('chk-grid')?.addEventListener('change', (e) => {
    getScene()?.setShowGrid((e.target as HTMLInputElement).checked);
  });
  document.getElementById('chk-shadow')?.addEventListener('change', (e) => {
    getScene()?.setShowShadow((e.target as HTMLInputElement).checked);
  });
});
