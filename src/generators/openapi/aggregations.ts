import { OpenAPIV3 } from "openapi-types";

import { NumberSchema, StringSchema } from "./data_types";
import { QueryProcessorContext } from "./queries/query-generator";

import { JsonPath, pluralize, toCamelCase, toPascalCase } from "../../common";
import { PathError } from "../../common/io";
import {
  Aggregation,
  BaseMetricAggregationArguments,
  BucketAggregation,
  BucketAggregationName,
  BucketByTerms,
  CountAggregation,
  DateHistogram,
  EntitySchema,
  MaximumAggregation,
  MeanAggregation,
  MetricAggregation,
  MetricAggregationName,
  MinimumAggregation,
  PercentileAggregation,
  SumAggregation,
  bucketAggregationName,
  isBucketAggregation,
  metricAggregationName,
} from "../../specification";
import { UnknownEntity } from "./queries/select-query";

export function getAggregationMetric(aggregation: Aggregation): string {
  if (isBucketAggregation(aggregation)) {
    const bucketAggregation = aggregation as BucketAggregation;
    const name: BucketAggregationName = bucketAggregationName(bucketAggregation);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bucket: any = (bucketAggregation as any)[name];

    return getAggregationMetric(bucket.calculate);
  }

  return metricAggregationName(aggregation as MetricAggregation);
}

// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Output field naming conventions.
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
export function getMetricAlgorithmFieldName(metricAggregation: MetricAggregation): string {
  const algorithm = metricAggregationName(metricAggregation);
  const args = (metricAggregation as never)[algorithm] as BaseMetricAggregationArguments;
  if (args.as) {
    return args.as;
  }

  const namingConvention = metricAlgorithmNamingConventions[algorithm];

  if (!namingConvention) {
    throw new Error("found unknown metric aggregation");
  }

  return namingConvention(metricAggregation);
}

export function getBucketAlgorithmFieldName(bucketAggregation: BucketAggregation): string {
  const algorithm = bucketAggregationName(bucketAggregation);
  const namingConvention = bucketAlgorithmNamingConventions[algorithm];

  if (!namingConvention) {
    throw new Error("found unknown metric aggregation");
  }

  return namingConvention(bucketAggregation);
}

const metricAlgorithmNamingConventions: {
  [key in MetricAggregationName]: (aggregation: MetricAggregation) => string;
} = {
  sum: (aggregation) => {
    const metric = aggregation as SumAggregation;
    return "sum" + toPascalCase(metric.sum.field);
  },
  count: (aggregation) => {
    const metric = aggregation as CountAggregation;
    return "count" + (metric.count.distinct ? `Distinct${toPascalCase(pluralize(metric.count.distinct))}` : "");
  },
  min: () => "min",
  max: () => "max",
  mean: () => "mean",
  percentile: (aggregation) => {
    const metric = aggregation as PercentileAggregation;
    return "percentile" + toPascalCase(metric.percentile.field);
  },
};

// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Output schema conventions.
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
export function renderMetricAggregationSchema(
  metricAggregation: MetricAggregation,
  sourceEntity: string,
  context: QueryProcessorContext,
): OpenAPIV3.SchemaObject {
  const algorithm = metricAggregationName(metricAggregation);
  return metricAggregationSchemas[algorithm](metricAggregation, sourceEntity, context);
}

export function renderBucketAggregationSchema(
  bucketAggregation: BucketAggregation,
  sourceEntity: string,
  context: QueryProcessorContext,
): OpenAPIV3.SchemaObject {
  const algorithm = bucketAggregationName(bucketAggregation);
  return bucketAlgorithmSchemas[algorithm](bucketAggregation, sourceEntity, context);
}

const metricAggregationSchemas: {
  [key in MetricAggregationName]: (
    aggregation: MetricAggregation,
    sourceEntity: string,
    context: QueryProcessorContext,
  ) => OpenAPIV3.SchemaObject;
} = {
  sum: (aggregation: MetricAggregation, sourceEntity: string, context: QueryProcessorContext): OpenAPIV3.SchemaObject => {
    checkEntityExists((aggregation as SumAggregation).sum.field, sourceEntity, context);
    return NumberSchema;
  },
  count: (aggregation: MetricAggregation, sourceEntity: string, context: QueryProcessorContext): OpenAPIV3.SchemaObject => {
    checkEntityExists((aggregation as CountAggregation).count.distinct, sourceEntity, context);
    return NumberSchema;
  },
  min: (aggregation: MetricAggregation, sourceEntity: string, context: QueryProcessorContext): OpenAPIV3.SchemaObject => {
    checkEntityExists((aggregation as MinimumAggregation).min.field, sourceEntity, context);
    return NumberSchema;
  },
  max: (aggregation: MetricAggregation, sourceEntity: string, context: QueryProcessorContext): OpenAPIV3.SchemaObject => {
    checkEntityExists((aggregation as MaximumAggregation).max.field, sourceEntity, context);
    return NumberSchema;
  },
  mean: (aggregation: MetricAggregation, sourceEntity: string, context: QueryProcessorContext): OpenAPIV3.SchemaObject => {
    checkEntityExists((aggregation as MeanAggregation).mean.field, sourceEntity, context);
    return NumberSchema;
  },
  percentile: (aggregation: MetricAggregation, sourceEntity: string, context: QueryProcessorContext): OpenAPIV3.SchemaObject => {
    checkEntityExists((aggregation as PercentileAggregation).percentile.field, sourceEntity, context);
    return NumberSchema;
  },
};

function checkEntityExists(field: string | undefined, sourceEntity: string, context: QueryProcessorContext) {
  if (!field) {
    return;
  }

  if (UnknownEntity === sourceEntity) {
    return context.schemaRegistry.has(field);
  }

  const schema: EntitySchema = context.schemaRegistry.get(sourceEntity);
  if (!schema) {
    throw new PathError("could not determine aggregated entity", context.jsonPath || "", "aggregation");
  }

  const fieldSchema = Object.keys(schema.properties || {}).find((property) => toCamelCase(property) === toCamelCase(field));
  if (!fieldSchema) {
    // throw new PathError(`unknown field [${field}]`, context.jsonPath || "", "aggregation");
  }
}

const bucketAlgorithmSchemas: {
  [key in BucketAggregationName]: (
    aggregation: BucketAggregation,
    sourceEntity: string,
    context: QueryProcessorContext,
  ) => OpenAPIV3.SchemaObject;
} = {
  date_histogram: (aggregation: BucketAggregation, sourceEntity: string, context: QueryProcessorContext): OpenAPIV3.SchemaObject => {
    const bucket = aggregation as DateHistogram;
    const jsonPath = JsonPath.resolve(context.jsonPath || "", "date_histogram");
    const itemSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {},
    };

    itemSchema.properties = itemSchema.properties || {};
    itemSchema.properties[bucket.date_histogram.interval] = StringSchema;
    itemSchema.properties["amount"] = renderMetricAggregationSchema(bucket.date_histogram.calculate, sourceEntity, {
      ...context,
      jsonPath,
    });
    return {
      type: "array",
      items: itemSchema,
      maxItems: bucket.date_histogram.last,
    };
  },
  terms: (aggregation: BucketAggregation, sourceEntity: string, context: QueryProcessorContext): OpenAPIV3.SchemaObject => {
    const bucket = aggregation as BucketByTerms;
    const jsonPath = JsonPath.resolve(context.jsonPath || "", "terms");
    const itemSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {},
    };

    itemSchema.properties = itemSchema.properties || {};
    itemSchema.properties[bucket.terms.field] = StringSchema;
    itemSchema.properties["amount"] = renderMetricAggregationSchema(bucket.terms.calculate, sourceEntity, { ...context, jsonPath });
    return {
      type: "array",
      items: itemSchema,
      maxItems: bucket.terms.size,
    };
  },
};

const bucketAlgorithmNamingConventions: {
  [key in BucketAggregationName]: (aggregation: BucketAggregation) => string;
} = {
  date_histogram: (aggregation: BucketAggregation): string => {
    const bucket = aggregation as DateHistogram;
    return getMetricAlgorithmFieldName(bucket.date_histogram.calculate) + "By" + toPascalCase(bucket.date_histogram.interval);
  },
  terms: (aggregation: BucketAggregation): string => {
    const bucket = aggregation as BucketByTerms;
    return getMetricAlgorithmFieldName(bucket.terms.calculate) + "By" + toPascalCase(bucket.terms.field);
  },
};
