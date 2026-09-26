import { Plane, Raycaster, Vector2, Vector3, type Group, type PerspectiveCamera } from "three";
import type { HologramParams } from "../types";
import type { ParticleUniforms } from "./scene/particleField";

/* ------------------------------------------------------------------ */
/* Pointer interaction: a virtual cursor projected onto a plane through */
/* the model, a spring-damper impulse that pushes particles, glow       */
/* energy that decays after movement, pinch / wheel zoom and a gentle   */
/* camera parallax.                                                     */
/* ------------------------------------------------------------------ */

export type InteractionOptions = {
  container: HTMLElement;
  camera: PerspectiveCamera;
  posGroup: Group;
  rotGroup: Group;
  uniforms: ParticleUniforms;
  params: () => HologramParams;
  initialModelScale: number;
  enableZoom: boolean;
};

export function createInteraction({
  container,
  camera,
  posGroup,
  rotGroup,
  uniforms: u,
  params,
  initialModelScale,
  enableZoom,
}: InteractionOptions) {
  const raycaster = new Raycaster();
  const mouseNDC = new Vector2();
  const mousePlane = new Plane();
  const mouseHit = new Vector3();
  const modelCenter = new Vector3();
  const cameraDir = new Vector3();
  const targetMousePos = new Vector3();
  const smoothMousePos = new Vector3();
  const prevMousePos = new Vector3();
  const frameVel = new Vector3();
  const smoothVel = new Vector3();
  const impVel = new Vector3();
  const impulse = new Vector3();
  let glowEnergy = 0;
  let mouseMoving = false;
  let activePointerId: number | null = null;
  const clampScale = (scale: number) => Math.min(Math.max(scale, 0.55), 1.9);
  const defaultModelScale = clampScale(initialModelScale);
  let modelScale = defaultModelScale;
  let targetModelScale = defaultModelScale;
  let pinchStartDistance = 0;
  let pinchStartScale = defaultModelScale;
  const pointerPositions = new Map<number, { x: number; y: number; type: string }>();
  let touchInfluence = 0;
  let targetTouchInfluence = 0;
  const CAM_RADIUS = camera.position.z;
  let camX = 0;
  let camY = 0;
  let camVelX = 0;
  let camVelY = 0;
  let moveTimer = 0;
  const MOVE_TIMEOUT = 0.06;
  let mouseEverMoved = false;

  const touchPointers = () =>
    [...pointerPositions.values()].filter((pointer) => pointer.type === "touch");
  const touchDistance = () => {
    const touches = touchPointers();
    if (touches.length < 2) return 0;
    return Math.hypot(touches[0].x - touches[1].x, touches[0].y - touches[1].y);
  };

  const updatePointerPosition = (clientX: number, clientY: number) => {
    const rect = container.getBoundingClientRect();
    mouseNDC.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(mouseNDC, camera);
    if (raycaster.ray.intersectPlane(mousePlane, mouseHit)) {
      const localPos = mouseHit
        .clone()
        .sub(posGroup.position)
        .divideScalar(Math.max(modelScale, 0.001))
        .applyQuaternion(rotGroup.quaternion.clone().invert());
      targetMousePos.copy(localPos);
      if (!mouseEverMoved) {
        smoothMousePos.copy(localPos);
        prevMousePos.copy(localPos);
        mouseEverMoved = true;
      }
    }
    mouseMoving = true;
    moveTimer = 0;
  };

  const onWheel = (e: WheelEvent) => {
    if (e.cancelable) e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.0012);
    targetModelScale = clampScale(targetModelScale * factor);
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.cancelable) e.preventDefault();
    pointerPositions.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
    activePointerId = e.pointerId;
    container.setPointerCapture?.(e.pointerId);
    const touches = touchPointers();
    if (touches.length >= 2) {
      mouseMoving = false;
      targetTouchInfluence = 0;
      pinchStartDistance = touchDistance();
      pinchStartScale = targetModelScale;
      return;
    }
    targetTouchInfluence = e.pointerType === "touch" ? 1 : 0;
    updatePointerPosition(e.clientX, e.clientY);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (
      activePointerId !== null &&
      e.pointerId !== activePointerId &&
      !pointerPositions.has(e.pointerId)
    )
      return;
    if (e.cancelable) e.preventDefault();
    pointerPositions.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
    const touches = touchPointers();
    if (touches.length >= 2) {
      const distance = touchDistance();
      if (enableZoom && pinchStartDistance > 0 && distance > 0) {
        targetModelScale = clampScale(pinchStartScale * (distance / pinchStartDistance));
      }
      mouseMoving = false;
      targetTouchInfluence = 0;
      return;
    }
    targetTouchInfluence = e.pointerType === "touch" ? 1 : targetTouchInfluence;
    updatePointerPosition(e.clientX, e.clientY);
  };

  const endPointer = (e: PointerEvent) => {
    if (
      activePointerId !== null &&
      e.pointerId !== activePointerId &&
      !pointerPositions.has(e.pointerId)
    )
      return;
    pointerPositions.delete(e.pointerId);
    mouseMoving = false;
    targetTouchInfluence = 0;
    if (container.hasPointerCapture?.(e.pointerId)) {
      container.releasePointerCapture(e.pointerId);
    }
    const remainingTouches = touchPointers();
    if (remainingTouches.length >= 2) {
      pinchStartDistance = touchDistance();
      pinchStartScale = targetModelScale;
    } else if (pointerPositions.size > 0) {
      activePointerId = [...pointerPositions.keys()][0];
    } else {
      activePointerId = null;
      pinchStartDistance = 0;
    }
  };

  if (enableZoom) container.addEventListener("wheel", onWheel, { passive: false });
  container.addEventListener("pointerdown", onPointerDown, { passive: false });
  container.addEventListener("pointermove", onPointerMove, { passive: false });
  container.addEventListener("pointerup", endPointer);
  container.addEventListener("pointercancel", endPointer);
  container.addEventListener("pointerleave", endPointer);

  function update(delta: number) {
    const p = params();

    moveTimer += delta;
    if (moveTimer > MOVE_TIMEOUT) mouseMoving = false;
    modelScale += (targetModelScale - modelScale) * (1 - Math.exp(-10 * delta));
    posGroup.scale.setScalar(modelScale);
    touchInfluence +=
      (targetTouchInfluence - touchInfluence) *
      (1 - Math.exp(-(targetTouchInfluence > touchInfluence ? 8 : 5.5) * delta));

    posGroup.getWorldPosition(modelCenter);
    camera.getWorldDirection(cameraDir);
    mousePlane.setFromNormalAndCoplanarPoint(cameraDir, modelCenter);

    // ── Smooth mouse position ─────────────────────────────────────────────
    if (mouseEverMoved) {
      const alpha = 1 - Math.exp(-p.mouseLerp * delta);
      smoothMousePos.lerp(targetMousePos, alpha);
      u.mousePos.value.copy(smoothMousePos);
    }

    if (mouseMoving) {
      frameVel
        .subVectors(smoothMousePos, prevMousePos)
        .divideScalar(Math.max(delta, 0.001))
        .clampLength(0, 8.0);
      smoothVel.lerp(frameVel, 0.15);
    } else {
      smoothVel.multiplyScalar(0.85);
    }

    // ── Spring-damper ─────────────────────────────────────────────────────
    const k = p.springStiffness;
    const c = p.springDamping;

    impVel.x += (-k * impulse.x - c * impVel.x) * delta;
    impVel.y += (-k * impulse.y - c * impVel.y) * delta;
    impVel.z += (-k * impulse.z - c * impVel.z) * delta;

    if (mouseMoving) {
      const push = p.pushStrength;
      const touchPush = 1 + touchInfluence * 0.32;
      impVel.x += smoothVel.x * push * touchPush * delta;
      impVel.y += smoothVel.y * push * touchPush * delta;
      impVel.z += smoothVel.z * push * touchPush * delta;
    }

    impulse.x += impVel.x * delta;
    impulse.y += impVel.y * delta;
    impulse.z += impVel.z * delta;
    impulse.clampLength(0, 3.5 + touchInfluence * 0.55);

    u.mouseRadius.value = p.mouseRadius * (1 + touchInfluence * 0.18);
    u.mouseStrength.value = p.mouseStrength * (1 + touchInfluence * 0.08);
    u.mouseScatter.value = p.mouseScatter + touchInfluence * 0.16;
    u.mouseVel.value.copy(impulse);
    prevMousePos.copy(smoothMousePos);

    // ── Glow energy ───────────────────────────────────────────────────────
    const currentImpulse = impulse.length();
    if (currentImpulse > glowEnergy) glowEnergy = currentImpulse;
    glowEnergy *= Math.exp(-p.mouseGlowDecay * delta);
    u.mouseGlowEnergy.value = glowEnergy;

    // ── Camera parallax ───────────────────────────────────────────────────
    {
      const intensity = p.camIntensity;
      const ck = p.camStiffness;
      const cc = p.camDamping;
      const nx = mouseEverMoved ? mouseNDC.x : 0;
      const ny = mouseEverMoved ? mouseNDC.y : 0;
      const targetX = nx * intensity * 0.05;
      const targetY = ny * intensity * 0.05;
      camVelX += ((targetX - camX) * ck - camVelX * cc) * delta;
      camVelY += ((targetY - camY) * ck - camVelY * cc) * delta;
      camX += camVelX * delta;
      camY += camVelY * delta;
      camera.position.set(camX, camY, CAM_RADIUS);
      // always aimed at the stage centre (roll-free)
      camera.lookAt(0, 0, 0);
    }
  }

  return {
    update,
    get mouseEverMoved() {
      return mouseEverMoved;
    },
    dispose() {
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", endPointer);
      container.removeEventListener("pointercancel", endPointer);
      container.removeEventListener("pointerleave", endPointer);
    },
  };
}
