import { useEffect, useState } from 'react';
import { departmentDefinitions, type DepartmentConfig } from '@/enterprise/models/department';
import { departmentStatus, departmentStatuses } from '@/enterprise/services/enterpriseService';

interface DepartmentViewModel extends DepartmentConfig {
  status: 'locked' | 'unlocked';
}

export function useEnterpriseDepartments() {
  const [departments, setDepartments] = useState<DepartmentViewModel[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);

    try {
      const statuses = await departmentStatuses();
      const mapped = departmentDefinitions.map((department) => ({
        ...department,
        status: statuses[department.key]?.status || 'locked',
      }));

      setDepartments(mapped);
    } catch (error) {
      console.error(error);
      const fallback: DepartmentViewModel[] = departmentDefinitions.map((department) => ({
        ...department,
        status: 'locked',
      }));
      setDepartments(fallback);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  return { departments, loading, refresh };
}

export async function getDepartmentViewModel(departmentKey: string) {
  const status = await departmentStatus(departmentKey as any);
  const definition = departmentDefinitions.find((entry) => entry.key === departmentKey);

  return {
    ...definition,
    status: status.status,
  };
}
