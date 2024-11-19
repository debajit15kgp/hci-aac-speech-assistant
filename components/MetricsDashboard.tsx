import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Timer, Activity, Zap, Brain } from "lucide-react";

interface MetricsDashboardProps {
  metrics: {
    typingToSpeechLatency: number;
    averageWordDelay: number;
    conversationFlowScore: number;
    typingSpeechOverlapRate: number;
    predictiveAccuracy: number;
    interactionSpeed: number;
    predictionAcceptanceRate: number;
    correctionRate: number;
    completionEfficiency: number;
  };
}

const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ metrics }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Timing Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Timing Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Speech Delay</span>
                <span className="text-sm font-medium">
                  {metrics.typingToSpeechLatency.toFixed(0)}ms
                </span>
              </div>
              <Progress 
                value={100 - Math.min(100, (metrics.typingToSpeechLatency / 2000) * 100)} 
              />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Conversation Flow</span>
                <span className="text-sm font-medium">
                  {(metrics.conversationFlowScore * 100).toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={metrics.conversationFlowScore * 100}
              />
            </div>
          </CardContent>
        </Card>

        {/* Prediction Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Prediction Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Prediction Accuracy</span>
                <span className="text-sm font-medium">
                  {(metrics.predictiveAccuracy * 100).toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={metrics.predictiveAccuracy * 100}
              />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Acceptance Rate</span>
                <span className="text-sm font-medium">
                  {(metrics.predictionAcceptanceRate * 100).toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={metrics.predictionAcceptanceRate * 100}
              />
            </div>
          </CardContent>
        </Card>

        {/* Efficiency Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Communication Speed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {metrics.interactionSpeed.toFixed(1)}
                </div>
                <div className="text-sm text-gray-500">Words per Minute</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {(metrics.completionEfficiency * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-500">Effort Saved</div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Error Rate</span>
                <span className="text-sm font-medium text-red-500">
                  {(metrics.correctionRate * 100).toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={100 - (metrics.correctionRate * 100)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Integration Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Speaking Integration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg mb-4">
                <div className="text-2xl font-bold text-purple-600">
                  {metrics.averageWordDelay.toFixed(0)}ms
                </div>
                <div className="text-sm text-gray-500">Average Word Delay</div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Speech-Typing Overlap</span>
                  <span className="text-sm font-medium">
                    {(metrics.typingSpeechOverlapRate * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={metrics.typingSpeechOverlapRate * 100}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MetricsDashboard;