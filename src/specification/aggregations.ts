import _ = require("underscore");

import { EntityName } from "./specification";

export type FieldName = string;

/**
 * The top level Aggregation, includes all optional fields and is either a metric or bucket aggregation.
 */
export type Aggregation = BaseAggregation & (MetricAggregation | BucketAggregation);

/**
 * The base fields on all root aggregations.
 */
export interface BaseAggregation {
  name?: string;
}

/**
 * The set of metric aggregations.
 */
export type MetricAggregation =
  | SumAggregation
  | CountAggregation
  | MinimumAggregation
  | MaximumAggregation
  | MeanAggregation
  | PercentileAggregation;

/**
 * The set of bucket aggregations.
 */
export type BucketAggregation = DateHistogram | BucketByTerms;

// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Bucket aggregations
// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
const metricNames = ["sum", "count", "min", "max", "mean", "percentile"] as const;
export type MetricAggregationName = (typeof metricNames)[number];
type BaseMetricAggregation<OperatorName extends MetricAggregationName, T extends BaseMetricAggregationArguments> = {
  [key in OperatorName]: T;
};
/**
 * The base arguments for all metric aggregations.
 */
export interface BaseMetricAggregationArguments {
  /**
   * The alias for the aggregate, (e.g. COUNT(*) as totalRecords)
   */
  as?: string;
}

/**
 * The base arguments for all metric aggregations.
 */
export interface PerFieldMetricAggregationArguments extends BaseMetricAggregationArguments {
  field: FieldName;
}

/**
 * Calculates the sum of values of a given field.
 */
export type SumAggregation = BaseMetricAggregation<"sum", PerFieldMetricAggregationArguments>;

/**
 * @minItems 1
 * @maxItems 1
 */
export type SingleField = Array<FieldName>;
/**
 * @minProperties 1
 * @maxProperties 1
 */
export type SingleFieldReference = Record<EntityName, SingleField>;
export type FieldReference = FieldName | SingleFieldReference;

/**
 * Calculates the count  value of a given field.
 */
export type CountAggregation = BaseMetricAggregation<
  "count",
  BaseMetricAggregationArguments & {
    /**
     * Flag indicating of only the distinct values should be counted.
     */
    distinct?: string;
  }
>;

/**
 * Calculates the minimum value of a given field.
 */
export type MinimumAggregation = BaseMetricAggregation<"min", PerFieldMetricAggregationArguments>;

/**
 * Calculates the maximum value of a given field.
 */
export type MaximumAggregation = BaseMetricAggregation<"max", PerFieldMetricAggregationArguments>;

/**
 * Calculates the mean value of a given field.
 */
export type MeanAggregation = BaseMetricAggregation<"mean", PerFieldMetricAggregationArguments>;

/**
 * Calculates the percentile values of a given field.
 */
export type PercentileAggregation = BaseMetricAggregation<"percentile", PerFieldMetricAggregationArguments>;

// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Bucket aggregations
// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
const bucketAggregationNames = ["date_histogram", "terms"] as const;
export type BucketAggregationName = (typeof bucketAggregationNames)[number];
type BaseBucketAggregation<OperatorName extends BucketAggregationName, T extends BucketAggregationArguments> = {
  [key in OperatorName]: T;
};
/**
 * The base arguments for all metric aggregations.
 */
export interface BucketAggregationArguments {
  /**
   * The metric to calculate per bucket.
   */
  calculate: MetricAggregation;
}

/**
 * A bucket aggregation that uses date math to generate histograms for time-series data
 */
export type Interval = "day" | "month" | "year" | "week" | "quarter";
export type DateHistogram = BaseBucketAggregation<
  "date_histogram",
  BucketAggregationArguments & {
    /**
     * The interval to use when generating buckets
     */
    interval: Interval;

    /**
     * Specifies that only the most recent "last" buckets should be returned.
     */
    last?: number;
  }
>;

/**
 * A bucket aggregation that dynamically creates a bucket for each unique term of a field.
 */
export type BucketByTerms = BaseBucketAggregation<
  "terms",
  BucketAggregationArguments & {
    /**
     * The name of the field where the distinct terms will be derived from.
     */
    field: FieldName;

    /**
     * Specifies that the query should return the top "size" buckets.
     */
    size?: number;
  }
>;

export function metricAggregationName(aggregation: MetricAggregation): MetricAggregationName {
  return Object.keys(aggregation).find((key) => {
    return metricNames.includes(key as MetricAggregationName);
  }) as MetricAggregationName;
}

export function bucketAggregationName(aggregation: BucketAggregation): BucketAggregationName {
  return Object.keys(aggregation).find((key) => {
    return bucketAggregationNames.includes(key as BucketAggregationName);
  }) as BucketAggregationName;
}

/**
 * Determines if an aggregation is a BucketAggregation.
 *
 * @param aggregation The aggregation to check.
 *
 * @returns true if and only if the aggregation is an instance of a BucketAggregation.
 */
export function isBucketAggregation(aggregation: Aggregation): boolean {
  return _.some(Object.keys(aggregation), (key: string) => bucketAggregationNames.includes(key as BucketAggregationName));
}

export function isMetricAggregation(aggregation: Aggregation): boolean {
  return _.some(Object.keys(aggregation), (key: string) => metricNames.includes(key as MetricAggregationName));
}
