import DocumentStudio from '@/components/documents/DocumentStudio';
import { useSearchParams } from 'react-router-dom';

export default function AIResumePage() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const documentId = projectId ? `${projectId}:cv` : 'facemex-ai-resume';

  return <DocumentStudio kind="cv" documentId={documentId} documentName="My CV" projectId={projectId} />;
}

