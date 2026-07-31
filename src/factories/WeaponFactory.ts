import * as THREE from 'three';

export class WeaponFactory {
  /** Builds the 3D Falchion sword mesh (with optional 1st-person arm viewmodels) */
  public static buildFalchionMesh(
    bladeMat: THREE.MeshStandardMaterial,
    guardMat: THREE.MeshStandardMaterial,
    scale: number = 1.0,
    includeFirstPersonArm: boolean = false
  ): THREE.Group {
    const group = new THREE.Group();

    // Falchion blade shape: narrow at hilt, widens toward tip, single curved edge
    const bladeShape = new THREE.Shape();
    const bLen = 0.8 * scale;
    bladeShape.moveTo(0, 0);
    bladeShape.lineTo(0.025 * scale, 0);
    bladeShape.lineTo(0.03 * scale, bLen * 0.7);
    bladeShape.lineTo(0.02 * scale, bLen * 0.95);
    bladeShape.lineTo(0, bLen);
    bladeShape.lineTo(-0.02 * scale, bLen * 0.9);
    bladeShape.quadraticCurveTo(-0.045 * scale, bLen * 0.5, -0.025 * scale, 0);

    const extrudeSettings = {
      depth: 0.012 * scale,
      bevelEnabled: true,
      bevelThickness: 0.003,
      bevelSize: 0.002,
      bevelSegments: 1
    };

    const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(bladeShape, extrudeSettings), bladeMat);
    blade.position.set(0, 0.02, -0.006 * scale);
    group.add(blade);

    // Crossguard
    const guardGeo = new THREE.BoxGeometry(0.22 * scale, 0.035 * scale, 0.045 * scale);
    const guard = new THREE.Mesh(guardGeo, guardMat);
    guard.position.set(0, 0.01, 0);
    group.add(guard);

    // Handle/grip (wrapped leather look)
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.9, metalness: 0.05 });
    const handleGeo = new THREE.CylinderGeometry(0.02 * scale, 0.022 * scale, 0.18 * scale, 8);
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0, -0.1, 0);
    group.add(handle);

    // Pommel (round end cap)
    const pommelGeo = new THREE.SphereGeometry(0.025 * scale, 8, 6);
    const pommel = new THREE.Mesh(pommelGeo, guardMat);
    pommel.position.set(0, -0.2, 0);
    group.add(pommel);

    if (includeFirstPersonArm) {
      const gloveMat = new THREE.MeshStandardMaterial({ color: 0x3d2716, roughness: 0.75, metalness: 0.1 });
      const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x243242, roughness: 0.85 });

      const handGlove = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * scale, 0.03 * scale, 0.16 * scale, 10), gloveMat);
      handGlove.position.set(0, -0.1 * scale, 0);

      const armForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.048 * scale, 0.04 * scale, 0.42 * scale, 12), sleeveMat);
      armForearm.position.set(0.02 * scale, -0.28 * scale, 0.15 * scale);
      armForearm.rotation.x = -0.45;
      armForearm.rotation.z = -0.1;

      group.add(handGlove, armForearm);
    }

    return group;
  }

  /** Builds the 3D Heater Shield mesh (with optional 1st-person arm viewmodels) */
  public static buildHeaterShieldMesh(includeFirstPersonArm: boolean = false): THREE.Group {
    const group = new THREE.Group();

    const shieldShape = new THREE.Shape();
    const w = 0.22, h = 0.55;
    shieldShape.moveTo(-w, h * 0.5);
    shieldShape.lineTo(w, h * 0.5);
    shieldShape.quadraticCurveTo(w * 1.05, 0, 0, -h * 0.5);
    shieldShape.quadraticCurveTo(-w * 1.05, 0, -w, h * 0.5);

    const extrudeSettings = { depth: 0.04, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.005, bevelSegments: 2 };

    // Wood backing
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2514, roughness: 0.65, metalness: 0.1 });
    const shieldBody = new THREE.Mesh(new THREE.ExtrudeGeometry(shieldShape, extrudeSettings), woodMat);
    group.add(shieldBody);

    // Metallic gold rim (slightly larger)
    const rimShape = new THREE.Shape();
    const rw = w + 0.015;
    const rh = h + 0.02;
    rimShape.moveTo(-rw, rh * 0.5);
    rimShape.lineTo(rw, rh * 0.5);
    rimShape.quadraticCurveTo(rw * 1.05, 0, 0, -rh * 0.5);
    rimShape.quadraticCurveTo(-rw * 1.05, 0, -rw, rh * 0.5);

    const rimSettings = { depth: 0.045, bevelEnabled: false };
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xb8860b, metalness: 0.85, roughness: 0.25 });
    const rim = new THREE.Mesh(new THREE.ExtrudeGeometry(rimShape, rimSettings), rimMat);
    rim.position.set(0, 0, -0.003);
    group.add(rim);

    // Central boss (circle emblem)
    const bossMat = new THREE.MeshStandardMaterial({ color: 0xd4a846, metalness: 0.9, roughness: 0.2 });
    const bossGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.025, 16);
    const boss = new THREE.Mesh(bossGeo, bossMat);
    boss.rotation.x = Math.PI / 2;
    boss.position.set(0, 0.05, 0.05);
    group.add(boss);

    // Cross emblem on shield face
    const crossMat = new THREE.MeshStandardMaterial({ color: 0xd4a846, metalness: 0.85, roughness: 0.3 });
    const vertBar = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.01), crossMat);
    vertBar.position.set(0, 0.05, 0.055);
    const horizBar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 0.01), crossMat);
    horizBar.position.set(0, 0.12, 0.055);
    group.add(vertBar, horizBar);

    if (includeFirstPersonArm) {
      const gloveMat = new THREE.MeshStandardMaterial({ color: 0x3d2716, roughness: 0.75 });
      const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x243242, roughness: 0.85 });

      const leftGlove = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.03, 0.14, 10), gloveMat);
      leftGlove.position.set(0, 0, -0.05);
      leftGlove.rotation.x = Math.PI / 2;

      const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.04, 0.4, 12), sleeveMat);
      leftArm.position.set(-0.04, -0.2, -0.15);
      leftArm.rotation.x = -0.55;

      group.add(leftGlove, leftArm);
    }

    return group;
  }
}
