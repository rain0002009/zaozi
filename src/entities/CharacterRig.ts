export type RigPoint = { x: number; y: number };

export type RigPose = RigPoint & { rotation: number };

export const RIG_JOINTS = {
  root: { x: 128, y: 164 },
  torsoPivot: { x: 128, y: 135 },
  headNeck: { x: 123, y: 86 },
  rearHip: { x: 124, y: 135 },
  rearKnee: { x: 136, y: 164 },
  rearAnkle: { x: 137, y: 193 },
  frontHip: { x: 130, y: 135 },
  frontKnee: { x: 124, y: 166 },
  frontAnkle: { x: 132, y: 208 },
  rearShoulder: { x: 121, y: 89 },
  weaponShoulder: { x: 128, y: 89 },
  weaponElbow: { x: 117, y: 114 },
  weaponWrist: { x: 126, y: 135 },
  weaponGrip: { x: 126, y: 138 },
  knifeTip: { x: 166, y: 138 },
  rearSole: { x: 132, y: 204 },
  frontSole: { x: 148, y: 207 },
} as const satisfies Record<string, RigPoint>;

export const RIG_ROOT: RigPoint = RIG_JOINTS.root;

export const RIG_PARTS = [
  { name: 'rearThigh', textureKey: 'ren_rear_thigh_side', anchor: RIG_JOINTS.rearHip, layer: 10 },
  { name: 'rearShin', textureKey: 'ren_rear_shin_side', anchor: RIG_JOINTS.rearKnee, layer: 20 },
  { name: 'rearFoot', textureKey: 'ren_rear_foot_side', anchor: RIG_JOINTS.rearAnkle, layer: 30 },
  { name: 'rearArm', textureKey: 'ren_rear_arm_side', anchor: RIG_JOINTS.rearShoulder, layer: 40 },
  { name: 'torso', textureKey: 'ren_torso_side', anchor: RIG_JOINTS.torsoPivot, layer: 50 },
  { name: 'head', textureKey: 'ren_head_side', anchor: RIG_JOINTS.headNeck, layer: 60 },
  { name: 'frontThigh', textureKey: 'ren_front_thigh_side', anchor: RIG_JOINTS.frontHip, layer: 70 },
  { name: 'frontShin', textureKey: 'ren_front_shin_side', anchor: RIG_JOINTS.frontKnee, layer: 80 },
  { name: 'frontFoot', textureKey: 'ren_front_foot_side', anchor: RIG_JOINTS.frontAnkle, layer: 90 },
  { name: 'garmentHem', textureKey: 'ren_garment_hem_side', anchor: RIG_JOINTS.torsoPivot, layer: 100 },
  { name: 'weaponUpperArm', textureKey: 'ren_weapon_upper_arm_side', anchor: RIG_JOINTS.weaponShoulder, layer: 110 },
  { name: 'weaponForearm', textureKey: 'ren_weapon_forearm_side', anchor: RIG_JOINTS.weaponElbow, layer: 120 },
  { name: 'knife', textureKey: 'ren_weapon_knife', anchor: RIG_JOINTS.weaponGrip, layer: 130 },
  { name: 'weaponHand', textureKey: 'ren_weapon_hand_side', anchor: RIG_JOINTS.weaponWrist, layer: 140 },
] as const satisfies readonly {
  name: string;
  textureKey: string;
  anchor: RigPoint;
  layer: number;
}[];

export type RigPartDefinition = typeof RIG_PARTS[number];
export type RigPartName = RigPartDefinition['name'];
export type NeutralRigPose = Record<RigPartName, RigPose>;

export const RIG_CONNECTIONS = [
  { name: 'rearHip', from: 'torso', fromPoint: { x: -4, y: 0 }, to: 'rearThigh', toPoint: { x: 0, y: 0 } },
  { name: 'rearKnee', from: 'rearThigh', fromPoint: { x: 12, y: 29 }, to: 'rearShin', toPoint: { x: 0, y: 0 } },
  { name: 'rearAnkle', from: 'rearShin', fromPoint: { x: 1, y: 29 }, to: 'rearFoot', toPoint: { x: 0, y: 0 } },
  { name: 'frontHip', from: 'torso', fromPoint: { x: 2, y: 0 }, to: 'frontThigh', toPoint: { x: 0, y: 0 } },
  { name: 'frontKnee', from: 'frontThigh', fromPoint: { x: -6, y: 31 }, to: 'frontShin', toPoint: { x: 0, y: 0 } },
  { name: 'frontAnkle', from: 'frontShin', fromPoint: { x: 8, y: 42 }, to: 'frontFoot', toPoint: { x: 0, y: 0 } },
  { name: 'rearShoulder', from: 'torso', fromPoint: { x: -7, y: -46 }, to: 'rearArm', toPoint: { x: 0, y: 0 } },
  { name: 'weaponShoulder', from: 'torso', fromPoint: { x: 0, y: -46 }, to: 'weaponUpperArm', toPoint: { x: 0, y: 0 } },
  { name: 'weaponElbow', from: 'weaponUpperArm', fromPoint: { x: -11, y: 25 }, to: 'weaponForearm', toPoint: { x: 0, y: 0 } },
  { name: 'weaponWrist', from: 'weaponForearm', fromPoint: { x: 9, y: 21 }, to: 'weaponHand', toPoint: { x: 0, y: 0 } },
  { name: 'knifeGrip', from: 'weaponHand', fromPoint: { x: 0, y: 3 }, to: 'knife', toPoint: { x: 0, y: 0 } },
] as const satisfies readonly {
  name: string;
  from: RigPartName;
  fromPoint: RigPoint;
  to: RigPartName;
  toPoint: RigPoint;
}[];

export type RigConnectionName = typeof RIG_CONNECTIONS[number]['name'];
export type RigConnectionErrors = Record<RigConnectionName, number>;

export const RIG_TEXTURE_KEYS = RIG_PARTS.map((part) => part.textureKey);

export const createNeutralRigPose = (): NeutralRigPose => Object.fromEntries(
  RIG_PARTS.map((part) => [part.name, {
    x: part.anchor.x - RIG_ROOT.x,
    y: part.anchor.y - RIG_ROOT.y,
    rotation: 0,
  }]),
) as NeutralRigPose;

const transformPoint = (pose: RigPose, point: RigPoint): RigPoint => ({
  x: pose.x + Math.cos(pose.rotation) * point.x - Math.sin(pose.rotation) * point.y,
  y: pose.y + Math.sin(pose.rotation) * point.x + Math.cos(pose.rotation) * point.y,
});

export const measureRigConnections = (pose: NeutralRigPose): RigConnectionErrors => Object.fromEntries(
  RIG_CONNECTIONS.map((connection) => {
    const from = transformPoint(pose[connection.from], connection.fromPoint);
    const to = transformPoint(pose[connection.to], connection.toPoint);
    return [connection.name, Math.hypot(from.x - to.x, from.y - to.y)];
  }),
) as RigConnectionErrors;

export const RIG_FOOT_SOLES = {
  rearSole: { part: 'rearFoot', point: { x: -5, y: 11 }, expected: { x: 4, y: 40 } },
  frontSole: { part: 'frontFoot', point: { x: 16, y: -1 }, expected: { x: 20, y: 43 } },
} as const satisfies Record<string, { part: RigPartName; point: RigPoint; expected: RigPoint }>;

export const measureNeutralFootSoleErrors = (pose: NeutralRigPose): Record<keyof typeof RIG_FOOT_SOLES, number> =>
  Object.fromEntries(Object.entries(RIG_FOOT_SOLES).map(([name, sole]) => {
    const actual = transformPoint(pose[sole.part], sole.point);
    return [name, Math.hypot(actual.x - sole.expected.x, actual.y - sole.expected.y)];
  })) as Record<keyof typeof RIG_FOOT_SOLES, number>;
