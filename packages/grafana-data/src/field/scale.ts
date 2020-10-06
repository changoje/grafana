import { isNumber } from 'lodash';
import { reduceField, ReducerID } from '../transformations/fieldReducer';
import { Field, GrafanaTheme, Threshold } from '../types';
import { getFieldColorModeFor } from './fieldColor';
import { getActiveThresholdForValue } from './thresholds';

export interface ScaledValue {
  percent: number; // 0-1
  threshold: Threshold;
  color: string;
}

export type ScaleCalculator = (value: number) => ScaledValue;

export function getScaleCalculator(field: Field, seriesIndex: number, theme: GrafanaTheme): ScaleCalculator {
  const mode = getFieldColorModeFor(field);
  const getColor = mode.getCalculator(field, seriesIndex, theme);
  const info = getMinMaxAndDelta(field);

  return (value: number) => {
    const percent = (value - info.min!) / info.delta;
    const threshold = getActiveThresholdForValue(field, value, percent);

    return {
      percent,
      threshold,
      color: getColor(value, percent, threshold),
    };
  };
}

interface FieldMinMaxInfo {
  min?: number | null;
  max?: number | null;
  delta: number;
}

function getMinMaxAndDelta(field: Field): FieldMinMaxInfo {
  // Calculate min/max if required
  let min = field.config.min;
  let max = field.config.max;

  if (!isNumber(min) || !isNumber(max)) {
    if (field.values && field.values.length) {
      const stats = reduceField({ field, reducers: [ReducerID.min, ReducerID.max] });
      if (!isNumber(min)) {
        min = stats[ReducerID.min];
      }
      if (!isNumber(max)) {
        max = stats[ReducerID.max];
      }
    } else {
      min = 0;
      max = 100;
    }
  }

  return {
    min,
    max,
    delta: max! - min!,
  };
}
