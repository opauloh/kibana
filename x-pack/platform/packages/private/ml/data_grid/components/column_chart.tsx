/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { BarSeries, Chart, Settings, ScaleType } from '@elastic/charts';
import { mathWithUnits, type UseEuiTheme, type EuiDataGridColumn } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import type { ChartData } from '../lib/field_histograms';
import { isUnsupportedChartData } from '../lib/field_histograms';

import { useColumnChart } from '../hooks/use_column_chart';

const cssHistogram = ({ euiTheme }: UseEuiTheme) => ({
  width: '100%',
  height: mathWithUnits([euiTheme.size.xl, euiTheme.size.xxl], (x, y) => x + y),
});

const cssHistogramLegend = ({ euiTheme }: UseEuiTheme) =>
  ({
    color: euiTheme.colors.mediumShade,
    marginTop: euiTheme.size.xs,
    fontStyle: 'italic',
    fontWeight: 'normal',
  } as const);

interface Props {
  chartData: ChartData;
  columnType: EuiDataGridColumn;
  dataTestSubj: string;
  hideLabel?: boolean;
  maxChartColumns?: number;
}

const columnChartTheme = {
  background: { color: 'transparent' },
  chartMargins: {
    left: 0,
    right: 0,
    top: 0,
    bottom: 1,
  },
  chartPaddings: {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  scales: { barsPadding: 0.1 },
};

export const ColumnChart: FC<Props> = ({
  chartData,
  columnType,
  dataTestSubj,
  hideLabel,
  maxChartColumns,
}) => {
  const { data, legendText } = useColumnChart(chartData, columnType, maxChartColumns);
  const chartBaseTheme = useElasticChartsTheme();
  return (
    <div data-test-subj={dataTestSubj}>
      {!isUnsupportedChartData(chartData) && data.length > 0 && (
        <div css={cssHistogram} data-test-subj={`${dataTestSubj}-histogram`}>
          <Chart>
            <Settings
              theme={columnChartTheme}
              baseTheme={chartBaseTheme}
              locale={i18n.getLocale()}
            />
            <BarSeries
              id="histogram"
              name="count"
              xScaleType={ScaleType.Ordinal}
              yScaleType={ScaleType.Linear}
              xAccessor={'key_as_string'}
              yAccessors={['doc_count']}
              styleAccessor={(d) => d.datum.color}
              data={data}
            />
          </Chart>
        </div>
      )}
      <div
        className="eui-textTruncate"
        css={cssHistogramLegend}
        data-test-subj={`${dataTestSubj}-legend`}
      >
        {legendText}
      </div>
      {!hideLabel && (
        <div data-test-subj={`${dataTestSubj}-id`} className="eui-textTruncate histogramLabel">
          {columnType.id}
        </div>
      )}
    </div>
  );
};
