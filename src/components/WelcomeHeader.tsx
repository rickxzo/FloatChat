import { Brain, Waves, Compass, BookOpen } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

export function WelcomeHeader() {
  const quickTopics = [
    { icon: Waves, label: "Ocean Currents", color: "bg-blue-100 text-blue-700" },
    { icon: Brain, label: "Marine Biology", color: "bg-teal-100 text-teal-700" },
    { icon: Compass, label: "Deep Sea Exploration", color: "bg-indigo-100 text-indigo-700" },
    { icon: BookOpen, label: "Climate Research", color: "bg-cyan-100 text-cyan-700" }
  ];

  return (
    <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 border-b border-blue-200/30">
      <div className="max-w-6xl mx-auto">
        {/* Main Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Waves className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">OceanMind</h1>
            <p className="text-blue-100 text-lg">Your AI-powered oceanography learning companion</p>
          </div>
          <div className="ml-auto">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
              Advanced Ocean Analytics
            </Badge>
          </div>
        </div>

        {/* Quick Topics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {quickTopics.map((topic, index) => (
            <Card key={index} className="p-4 bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 transition-all cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${topic.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <topic.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{topic.label}</h3>
                  <p className="text-blue-100 text-sm">Explore now</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Learning Stats */}
        <div className="flex gap-6 mt-6 text-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3">
            <div className="text-2xl font-bold text-white">1,200+</div>
            <div className="text-blue-100 text-sm">Ocean Data Points</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3">
            <div className="text-2xl font-bold text-white">50+</div>
            <div className="text-blue-100 text-sm">Research Topics</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3">
            <div className="text-2xl font-bold text-white">24/7</div>
            <div className="text-blue-100 text-sm">AI Assistance</div>
          </div>
        </div>
      </div>
    </div>
  );
}