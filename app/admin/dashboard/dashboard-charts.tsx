"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { AdminDashboardData } from "@/types";

// --- Props Interface for the Charts Component ---
type DashboardChartsProps = {
  revenueAnalyticsData: AdminDashboardData["revenueAnalyticsData"];
  departmentRevenueData: AdminDashboardData["departmentRevenueData"];
};

// --- Interface for Pie Label Props ---
interface PieLabelRenderProps {
  cx: number;
  cy: number;
  midAngle?: number;
  innerRadius: number;
  outerRadius: number;
  name: string;
  value?: number;
  percent?: number;
  index?: number;
}

// --- Helper Functions
const formatCurrency = (value: number) => {
  if (typeof value !== "number") return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const renderSimpleLabel = ({ name, percent }: PieLabelRenderProps) => {
  if (percent === undefined || percent < 0.05) {
    return null;
  }
  return `${name}`;
};

export default function DashboardCharts({
  revenueAnalyticsData,
  departmentRevenueData,
}: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Revenue Analytics Card */}
      <Card className="p-6 rounded-lg border-border-2">
        <CardHeader className="p-0">
          <CardTitle className="body-semibold text-text-title">
            Revenue Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            {revenueAnalyticsData.length > 0 ? (
              <LineChart
                data={revenueAnalyticsData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e0e0e0"
                />

                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  fontSize={12}
                />

                {/* It's good practice to format the Y-axis for large numbers */}
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  fontSize={12}
                  tickFormatter={(value) => `$${Number(value) / 1000}k`}
                />

                {/* A formatted tooltip improves user experience */}
                <Tooltip formatter={(value: number) => formatCurrency(value)} />

                <Line
                  type="monotone"
                  dataKey="Revenue"
                  stroke="#4A90E2"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No revenue data available for this period.
              </div>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>
      {/* Department Revenue Card */}
      <Card className="p-6 rounded-lg border-border-2">
        <CardHeader className="p-0">
          <CardTitle className="body-semibold text-text-title">
            Department Revenue Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center">
          <ResponsiveContainer width="100%" height={300}>
            {departmentRevenueData.length > 0 ? (
              <PieChart>
                <Pie
                  data={departmentRevenueData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={renderSimpleLabel}
                  innerRadius={65}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={0}
                  dataKey="value"
                >
                  {departmentRevenueData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke="none"
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No department revenue data available.
              </div>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
