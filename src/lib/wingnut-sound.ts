/**
 * The landing sound for the raining wingnuts (WingnutRain.svelte): a soft thud, made on the spot with the
 * Web Audio API, so there are no audio files.
 *
 * Browsers keep a page silent until the visitor clicks, taps or presses a key on it. So the site listens for
 * that first interaction on every page (see `listenForFirstClick`, used by the page layout), not only on the
 * home page: the click on the logo from another page is what unlocks the sound for the shower it starts.
 */

/** Sound effects on or off. */
const SOUND = true;
/** How loud, from 0 (silent) to 1. */
const VOLUME = 0.9;

let audio: AudioContext | undefined;
let out: GainNode | undefined;
let noise: AudioBuffer | undefined;
let lastThud = 0;

/** Called on a click, tap or key press: from then on the page is allowed to make sound. */
function wake() {
	if (!SOUND) return;
	if (!audio) {
		const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
		if (!Ctx) return;
		audio = new Ctx();
		out = audio.createGain();
		out.gain.value = VOLUME;
		const squash = audio.createDynamicsCompressor();
		out.connect(squash);
		squash.connect(audio.destination);
		noise = audio.createBuffer(1, audio.sampleRate * 0.25, audio.sampleRate);
		const data = noise.getChannelData(0);
		for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
	}
	if (audio.state === 'suspended') audio.resume();
}

/** Start listening for the visitor's interactions. Returns a function that stops listening. */
export function listenForFirstClick() {
	/* Any of these counts as an interaction; browsers differ on which ones unlock sound. */
	const unlock = ['pointerdown', 'mousedown', 'mouseup', 'touchend', 'click', 'keydown'];
	for (const type of unlock) document.addEventListener(type, wake, true);
	return () => { for (const type of unlock) document.removeEventListener(type, wake, true); };
}

/** Where a sound comes from, left to right, so it matches where it happened on screen. */
function placed(pan: number): AudioNode {
	if (!audio!.createStereoPanner) return out!;
	const side = audio!.createStereoPanner();
	side.pan.value = Math.max(-1, Math.min(1, pan));
	side.connect(out!);
	return side;
}

/** A landing: a low, short, muffled bump. `soft` is for a wingnut landing on other wingnuts rather than the floor. */
export function thud(strength: number, pan: number, soft = false) {
	if (!audio || !noise || audio.state !== 'running') return;
	const now = audio.currentTime;
	if (now - lastThud < 0.03) return;
	lastThud = now;
	const level = (0.3 + Math.min(1, strength) * 0.7) * (soft ? 0.32 : 0.7);
	const dest = placed(pan);
	const tone = audio.createOscillator();
	const amp = audio.createGain();
	/* Low, but not so low that laptop and phone speakers cannot reproduce it. */
	tone.frequency.setValueAtTime(190 + Math.random() * 40, now);
	tone.frequency.exponentialRampToValueAtTime(95, now + 0.11);
	amp.gain.setValueAtTime(level, now);
	amp.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
	tone.connect(amp); amp.connect(dest);
	tone.start(now); tone.stop(now + 0.16);
	const puff = audio.createBufferSource();
	const dull = audio.createBiquadFilter();
	const quiet = audio.createGain();
	puff.buffer = noise;
	dull.type = 'lowpass'; dull.frequency.value = 900;
	quiet.gain.setValueAtTime(level * 0.7, now);
	quiet.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
	puff.connect(dull); dull.connect(quiet); quiet.connect(dest);
	puff.start(now); puff.stop(now + 0.07);
}
