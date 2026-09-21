export type RigPoint = { x: number; y: number };

export type RigPose = RigPoint & { rotation: number };

export const RIG_JOINTS = {
  root: { x: 128, y: 164 },
  torsoPivot: { x: 128, y: 135 },
  headNeck: { x: 123, y: 86 },
  rearHip: { x: 124, y: 135 },
  rearKnee: { x: 136, y: 164 },
  frontHip: { x: 130, y: 135 },
  frontKnee: { x: 124, y: 166 },
  rearShoulder: { x: 121, y: 89 },
  rearElbow: { x: 114, y: 114 },
  frontShoulder: { x: 128, y: 89 },
  frontElbow: { x: 117, y: 114 },
  rearSole: { x: 132, y: 204 },
  frontSole: { x: 148, y: 207 },
} as const satisfies Record<string, RigPoint>;

export const RIG_ROOT: RigPoint = RIG_JOINTS.root;

export const RIG_PARTS = [
  { name: 'rearThigh', textureKey: 'ren_rear_thigh_side', anchor: RIG_JOINTS.rearHip, anchorKey: 'rearHip', layer: 10 },
  { name: 'rearShin', textureKey: 'ren_rear_shin_side', anchor: RIG_JOINTS.rearKnee, anchorKey: 'rearKnee', layer: 20 },
  { name: 'rearUpperArm', textureKey: 'ren_rear_arm_side', anchor: RIG_JOINTS.rearShoulder, anchorKey: 'rearShoulder', layer: 30 },
  { name: 'rearForearm', textureKey: 'ren_rear_forearm_side', anchor: RIG_JOINTS.rearElbow, anchorKey: 'rearElbow', layer: 40 },
  { name: 'torso', textureKey: 'ren_torso_side', anchor: RIG_JOINTS.torsoPivot, anchorKey: 'torsoPivot', layer: 50 },
  { name: 'head', textureKey: 'ren_head_side', anchor: RIG_JOINTS.headNeck, anchorKey: 'headNeck', layer: 60 },
  { name: 'frontThigh', textureKey: 'ren_front_thigh_side', anchor: RIG_JOINTS.frontHip, anchorKey: 'frontHip', layer: 70 },
  { name: 'frontShin', textureKey: 'ren_front_shin_side', anchor: RIG_JOINTS.frontKnee, anchorKey: 'frontKnee', layer: 80 },
  { name: 'frontUpperArm', textureKey: 'ren_weapon_upper_arm_side', anchor: RIG_JOINTS.frontShoulder, anchorKey: 'frontShoulder', layer: 90 },
  { name: 'frontForearm', textureKey: 'ren_weapon_forearm_side', anchor: RIG_JOINTS.frontElbow, anchorKey: 'frontElbow', layer: 100 },
] as const satisfies readonly {
  name: string;
  textureKey: string;
  anchor: RigPoint;
  anchorKey: string;
  layer: number;
}[];

export type RigPartDefinition = typeof RIG_PARTS[number];
export type RigPartName = RigPartDefinition['name'];
export type NeutralRigPose = Record<RigPartName, RigPose>;

export const RIG_CONNECTIONS = [
  { name: 'rearHip', from: 'torso', fromPoint: { x: -4, y: 0 }, to: 'rearThigh', toPoint: { x: 0, y: 0 } },
  { name: 'rearKnee', from: 'rearThigh', fromPoint: { x: 12, y: 29 }, to: 'rearShin', toPoint: { x: 0, y: 0 } },
  { name: 'frontHip', from: 'torso', fromPoint: { x: 2, y: 0 }, to: 'frontThigh', toPoint: { x: 0, y: 0 } },
  { name: 'frontKnee', from: 'frontThigh', fromPoint: { x: -6, y: 31 }, to: 'frontShin', toPoint: { x: 0, y: 0 } },
  { name: 'rearShoulder', from: 'torso', fromPoint: { x: -7, y: -46 }, to: 'rearUpperArm', toPoint: { x: 0, y: 0 } },
  { name: 'rearElbow', from: 'rearUpperArm', fromPoint: { x: -7, y: 25 }, to: 'rearForearm', toPoint: { x: 0, y: 0 } },
  { name: 'frontShoulder', from: 'torso', fromPoint: { x: 0, y: -46 }, to: 'frontUpperArm', toPoint: { x: 0, y: 0 } },
  { name: 'frontElbow', from: 'frontUpperArm', fromPoint: { x: -11, y: 25 }, to: 'frontForearm', toPoint: { x: 0, y: 0 } },
  { name: 'headNeck', from: 'torso', fromPoint: { x: -5, y: -49 }, to: 'head', toPoint: { x: 0, y: 0 } },
] as const satisfies readonly {
  name: string;
  from: RigPartName;
  fromPoint: RigPoint;
  to: RigPartName;
  toPoint: RigPoint;
}[];

export type RigConnectionName = typeof RIG_CONNECTIONS[number]['name'];
export type RigConnectionErrors = Record<RigConnectionName, number>;

export const RIG_TEXTURE_KEYS = Array.from(new Set(RIG_PARTS.map((part) => part.textureKey)));

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
