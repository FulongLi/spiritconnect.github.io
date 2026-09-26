import * as THREE from "three";

/* Day / night lighting palettes for the lunar scene. */
export const DAY = {
  background: new THREE.Color("#050608"),
  fogNear: 210,
  fogFar: 520,
  hemiSky: new THREE.Color("#9aa3ad"),
  hemiGround: new THREE.Color("#3c3f43"),
  hemiIntensity: 0.5,
  sunColor: new THREE.Color("#fff8ee"),
  sunIntensity: 3.0,
};

export const NIGHT = {
  background: new THREE.Color("#030407"),
  fogNear: 150,
  fogFar: 440,
  hemiSky: new THREE.Color("#1c2a44"),
  hemiGround: new THREE.Color("#0a0d12"),
  hemiIntensity: 0.4,
  sunColor: new THREE.Color("#8fb0e8"),
  sunIntensity: 0.25,
};
