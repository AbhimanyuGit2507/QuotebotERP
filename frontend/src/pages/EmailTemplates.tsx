import React from 'react';
import PageLayout from '../components/common/PageLayout';
import EmailTemplatesContent from '../components/EmailTemplatesContent';

export default function EmailTemplates() {
  return (
    <PageLayout>
      <div className="p-6">
        <EmailTemplatesContent />
      </div>
    </PageLayout>
  );
}
