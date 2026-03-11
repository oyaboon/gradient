import type { GradientMountOptions, GradientPresetInput } from ".";

export interface GradientMountProps {
  preset: GradientPresetInput;
  options?: Partial<GradientMountOptions>;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export function GradientMount(props: GradientMountProps): React.ReactElement;

export { Gradient, mountGradient } from ".";
export { mountSharedGradient } from ".";
export type {
  GradientFrameTransport,
  GradientInstance,
  GradientMountMode,
  GradientMountOptions,
  GradientMountTarget,
  GradientSharedInstance,
  GradientSharedMode,
  GradientSharedMountOptions,
  GradientSharedMountTarget,
  GradientParams,
  GradientPreset,
  GradientPresetInput,
  GradientQualityDefaults,
  LegacyPreset,
} from ".";
