import { ClassType } from '@/types';
import Image from 'next/image';

// Local images from public/images/ — one representative image per class type
const classTypeImages: Record<ClassType, string> = {
  yoga: '/images/yoga/pexels-vlada-karpovich-4534604.jpg',
  'hot-yoga': '/images/yoga/pexels-mikhail-nilov-7500315.jpg',
  pilates: '/images/pilates/pexels-ahmetkurt-25596674.jpg',
  barre: '/images/barre/pexels-cottonbro-4324015.jpg',
  spinning: '/images/spinning/pexels-tima-miroshnichenko-6388364.jpg',
};

export function getClassTypeImageUrl(type: ClassType): string {
  return classTypeImages[type];
}

export function ClassTypeImage({ type, size = 24, className = '' }: { type: ClassType; size?: number; className?: string }) {
  return (
    <Image
      src={classTypeImages[type]}
      alt={type}
      width={size}
      height={size}
      className={`rounded object-cover shrink-0 ${className}`}
      style={{ width: size, height: size }}
      unoptimized
    />
  );
}
