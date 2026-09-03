import { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts/core';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { LineChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsOption } from 'echarts';
import type { SieveRow } from './types/gradation';

echarts.use([GridComponent, LegendComponent, TooltipComponent, LineChart, CanvasRenderer]);

export function GradationChart(props: { rows: SieveRow[] }) {
  const chartRef = useRef<HTMLDivElement | null>(null);

  const option = useMemo<EChartsOption>(() => {
    const orderedRows = [...props.rows].sort((a, b) => b.sieveSizeMm - a.sieveSizeMm);

    return {
      tooltip: { trigger: 'axis' },
      legend: { top: 0, textStyle: { fontFamily: 'Tahoma' } },
      grid: { top: 48, right: 26, left: 42, bottom: 40 },
      xAxis: {
        type: 'category',
        data: orderedRows.map(row => row.label),
        axisLabel: { fontFamily: 'Tahoma' }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        name: 'درصد عبوری',
        nameTextStyle: { fontFamily: 'Tahoma' },
        axisLabel: { formatter: '{value}%' }
      },
      series: [
        {
          name: 'درصد عبوری مصالح',
          type: 'line',
          smooth: true,
          symbolSize: 8,
          data: orderedRows.map(row => row.percentPassing),
          lineStyle: { width: 4, color: '#4f7cff' },
          itemStyle: { color: '#4f7cff' }
        },
        {
          name: 'حد پایین',
          type: 'line',
          smooth: true,
          symbolSize: 6,
          data: orderedRows.map(row => row.standardMin),
          lineStyle: { width: 2, color: '#10b981', type: 'dashed' },
          itemStyle: { color: '#10b981' }
        },
        {
          name: 'حد بالا',
          type: 'line',
          smooth: true,
          symbolSize: 6,
          data: orderedRows.map(row => row.standardMax),
          lineStyle: { width: 2, color: '#f5a623', type: 'dashed' },
          itemStyle: { color: '#f5a623' }
        }
      ]
    };
  }, [props.rows]);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current);
    chart.setOption(option);

    const resize = () => chart.resize();
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      chart.dispose();
    };
  }, [option]);

  return <div className="gradation-chart" ref={chartRef} />;
}
