import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Container from 'components/Container'
import { useRouter } from 'next/router'
import img from 'assets/images/logo.png'
import { page } from 'types'
import { ARCHIVE_MODE } from 'utils/constants'
function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export default function Navbar({ pages }: { pages: page[] }) {
  const router = useRouter()
  const path = router.asPath
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const extendedPages: page[] = !ARCHIVE_MODE ? [...pages, { name: 'Archive', href: '/archive' }] : [{ name: 'Archive', href: '/archive' }]
  // const extendedPages: page[] = [
  //   { name: 'Gulf Stage', href: '/stage/stagegulfstage' },
  //   { name: 'Volcano Stage', href: '/stage/stagevolcanostage' },
  //   { name: 'Archive', href: '/archive' },
  // ]

  return (
    <nav className="bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700 py-2 h-[5rem] z-50">
      <Container>
        <div className="flex justify-between py-2">
          <div className="flex items-center">
            <Link href={ARCHIVE_MODE ? '/archive' : '/'}>
              <a className="relative w-28 h-12 lg:w-40 lg:h-12">
                <Image src={img} alt="Logo" layout="fill" objectFit="contain" />
              </a>
            </Link>
          </div>
          <div className="hidden md:flex"></div>
        </div>
      </Container>
    </nav>
  )
}
