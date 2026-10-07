import type { Metadata } from 'next';
import ApplyForm from './ApplyForm';

export const metadata: Metadata = {
  title: 'サブドメインを選ぶ | 覇気.com',
  description: 'あなた専用の「○○.覇気.com」を選べるローカル販売デモです。',
};

export default function ApplyPage() {
  return <ApplyForm />;
}
