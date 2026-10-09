import { Bell } from 'lucide-react';
import FaceMeXSettingsLayout from '../FaceMeXSettingsLayout';
import FaceMeXSettingsSection from '../FaceMeXSettingsSection';
import type { FaceMeXSettingsCategoryProps } from '../FaceMeXSettingsCategoryProps';
import type { FaceMeXNotificationType } from '@/types/facemexSettings';

const notificationOptions: Array<{ type: FaceMeXNotificationType; label: string; detail: string }> = [
  { type: 'like', label: 'Likes', detail: 'Activity on your posts' },
  { type: 'comment', label: 'Comments', detail: 'Replies and comments on your posts' },
  { type: 'follow', label: 'New followers', detail: 'When someone follows your profile' },
  { type: 'message', label: 'Messages', detail: 'New direct messages' },
  { type: 'event', label: 'Events', detail: 'Updates about FaceMeX events' },
  { type: 'circle', label: 'Communities', detail: 'Circle and community activity' },
  { type: 'endorsement', label: 'Endorsements', detail: 'Professional skill endorsements' },
];

export default function FaceMeXNotificationSettings({ settings, onSave, saving }: FaceMeXSettingsCategoryProps) {
  return (
    <FaceMeXSettingsLayout title="Notifications" description="Choose which FaceMeX activity appears in your notification center.">
      <FaceMeXSettingsSection title="FaceMeX activity">
        {notificationOptions.map(({ type, label, detail }) => (
          <label key={type} className="flex min-h-[68px] items-center gap-3 rounded-2xl border border-[#e7e7e7] bg-[#f1f1f1] px-4 py-3 dark:border-[#343434] dark:bg-[#1d1d1d]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#555] dark:bg-[#292929] dark:text-[#ddd]">
              <Bell className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{label}</span>
              <span className="mt-0.5 block text-xs text-[#777] dark:text-[#aaa]">{detail}</span>
            </span>
            <input
              type="checkbox"
              checked={settings.notifications[type]}
              disabled={saving}
              onChange={(event) => void onSave({
                ...settings,
                notifications: { ...settings.notifications, [type]: event.target.checked },
              })}
              aria-label={`${label} notifications`}
              className="h-5 w-5 accent-black dark:accent-white"
            />
          </label>
        ))}
      </FaceMeXSettingsSection>
    </FaceMeXSettingsLayout>
  );
}
