import { Link } from 'react-router-dom';
import FaceMeXSettingsLayout from '../FaceMeXSettingsLayout';
import type { FaceMeXSettingsCategoryProps } from '../FaceMeXSettingsCategoryProps';

export default function FaceMeXWorkspaceSettings(_: FaceMeXSettingsCategoryProps) {
  return (
    <FaceMeXSettingsLayout title="Workspace" description="Continue using the FaceMeX workspace and its existing project, file, and conversation systems.">
      <Link to="/ai/job-assistant" className="flex min-h-12 items-center justify-between rounded-xl border border-[#e6e6e6] bg-white px-4 text-sm font-medium dark:border-[#393939] dark:bg-[#202020]">
        Open AI workspace
      </Link>
    </FaceMeXSettingsLayout>
  );
}
