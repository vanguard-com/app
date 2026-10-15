import { strings } from '@/i18n';
import type { SubjectTarget } from '@/store/sessionStore';

export function subjectLabel(subject: SubjectTarget): string {
  switch (subject.kind) {
    case 'face':
      return strings.subject.options.face;
    case 'person':
      return strings.subject.options.person;
    case 'object':
      return subject.label;
  }
}
