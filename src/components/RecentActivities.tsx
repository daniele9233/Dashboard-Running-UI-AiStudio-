import { Footprints, Timer, HeartPulse, MapPin, Zap } from "lucide-react";

const activities = [
  {
    group: "TODAY",
    items: [
      {
        id: 1,
        title: "Morning Run",
        date: "Jul 20, 6:22 AM",
        distance: "+5.2 km",
        type: "Easy Run",
        icon: Footprints,
        iconBg: "bg-[#14B8A6]/10",
        iconColor: "text-[#14B8A6]",
      },
      {
        id: 2,
        title: "Track Session",
        date: "Jul 20, 12:30 PM",
        distance: "+8.5 km",
        type: "Intervals",
        icon: Zap,
        iconBg: "bg-[#F59E0B]/10",
        iconColor: "text-[#F59E0B]",
      },
    ],
  },
  {
    group: "YESTERDAY",
    items: [
      {
        id: 3,
        title: "Evening Jog",
        date: "Jul 19, 6:45 PM",
        distance: "+4.1 km",
        type: "Recovery",
        icon: HeartPulse,
        iconBg: "bg-[#8B5CF6]/10",
        iconColor: "text-[#8B5CF6]",
      },
      {
        id: 4,
        title: "Lunch Run",
        date: "Jul 19, 1:23 PM",
        distance: "+6.0 km",
        type: "Tempo",
        icon: Timer,
        iconBg: "bg-[#3B82F6]/10",
        iconColor: "text-[#3B82F6]",
      },
      {
        id: 5,
        title: "Trail Exploration",
        date: "Jul 19, 8:00 AM",
        distance: "+12.4 km",
        type: "Long Run",
        icon: MapPin,
        iconBg: "bg-[#F43F5E]/10",
        iconColor: "text-[#F43F5E]",
      },
    ],
  },
  {
    group: "JULY 18",
    items: [
      {
        id: 6,
        title: "City Loop",
        date: "Jul 18, 7:00 PM",
        distance: "+7.5 km",
        type: "Easy Run",
        icon: Footprints,
        iconBg: "bg-[#14B8A6]/10",
        iconColor: "text-[#14B8A6]",
      },
      {
        id: 7,
        title: "Hill Sprints",
        date: "Jul 18, 6:30 AM",
        distance: "+4.8 km",
        type: "Intervals",
        icon: Zap,
        iconBg: "bg-[#F59E0B]/10",
        iconColor: "text-[#F59E0B]",
      },
    ],
  },
];

export function RecentActivities() {
  return (
    <div className="bg-bg-card border border-[#1E293B] rounded-xl p-5 flex flex-col h-full">
      <h3 className="text-sm font-medium text-text-primary mb-6">Recent Activities</h3>
      <div className="flex-1 overflow-y-auto pr-2 space-y-6">
        {activities.map((group) => (
          <div key={group.group}>
            <h4 className="text-[10px] font-semibold text-text-muted tracking-wider mb-3 uppercase">
              {group.group}
            </h4>
            <div className="space-y-4">
              {group.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.iconBg}`}>
                      <item.icon className={`w-5 h-5 ${item.iconColor}`} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors">
                        {item.title}
                      </div>
                      <div className="text-xs text-text-muted">{item.date}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-text-primary">{item.distance}</div>
                    <div className="text-xs text-text-muted">{item.type}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
