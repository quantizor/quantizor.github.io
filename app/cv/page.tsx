import resume from '@/resume.json';
import { cn, generateMetadata } from '@/utils';
import Markdown from 'markdown-to-jsx';

import { Cedarville_Cursive } from 'next/font/google';

export const metadata = generateMetadata('CV');

const font = Cedarville_Cursive({
  weight: '400',
  subsets: ['latin'],
});

export default function CV() {
  return (
    <main>
      <h1 className={cn(`text-5xl text-center md:text-left`, font.className)}>{resume.personalInfo.name}</h1>

      <blockquote className="text-balance text-center md:text-left">{resume.summary}</blockquote>

      <section className="flex outline-1 outline-offset-14 md:outline-offset-20 flex-col gap-2 md:gap-4 mt-8 pb-1 md:pb-3">
        <header className="-mt-[28px] md:-mt-[34px]">
          <h2 className="inline-block text-sm bg-zinc-900 px-3 -ml-3 relative z-10">Current</h2>
        </header>

        {resume.currentWork.map((job) => (
          <article key={job.company} className="md:pl-7 print:pl-7 print:break-inside-avoid-page">
            <header className="flex flex-col gap-6 md:gap-4 print:gap-4">
              <div className="flex flex-col print:flex-row md:flex-row gap-[2px] md:gap-4 print:gap-4">
                <h3 className="flex font-bold gap-3">
                  <span className="text-current underline-offset-3">{job.company}</span>
                  <img
                    src={job.icon}
                    alt={`${job.company} logo`}
                    className="md:absolute print:absolute w-4 h-4 max-sm:translate-y-1 md:ml-[-28px] md:mt-1 print:ml-[-28px] print:mt-[1px]"
                  />
                </h3>
                <span className="italic text-zinc-200 print:text-zinc-800">{job.title}</span>
              </div>

              <p className="text-zinc-300 print:text-zinc-700 text-balance">{job.description}</p>

              {job.responsibilities && (
                <ul>
                  {job.responsibilities.map((role, index) => (
                    <li key={index} className="text-zinc-500 text-balance">
                      <Markdown>{role}</Markdown>
                    </li>
                  ))}
                </ul>
              )}
            </header>
          </article>
        ))}
      </section>

      <section className="flex flex-col gap-14 md:gap-10 print:gap-7 mt-8">
        <header className="">
          <h2 className={`inline-block text-3xl ${font.className}`}>prior roles</h2>
        </header>

        {resume.workExperience.map((job) => (
          <article key={job.company} className="md:pl-7 print:pl-7 print:break-inside-avoid-page">
            <header className="flex flex-col gap-6 md:gap-4 print:gap-4">
              <div className="flex flex-col print:flex-row md:flex-row gap-[2px] md:gap-4 print:gap-4">
                <h3 className="flex font-bold gap-3">
                  <a className="text-current underline-offset-3" href={job.url}>
                    {job.company}
                  </a>
                  <img
                    src={job.icon}
                    alt={`${job.company} logo`}
                    className="md:absolute print:absolute w-4 h-4 max-sm:translate-y-1 md:ml-[-28px] md:mt-1 print:ml-[-28px] print:mt-[1px]"
                  />
                </h3>
                <span className="italic text-zinc-200 print:text-zinc-800">{job.title}</span>
                <span className="font-light md:ml-auto print:ml-auto text-zinc-500">{job.period}</span>
              </div>

              <p className="text-zinc-300 print:text-zinc-700">{job.description}</p>

              {job.responsibilities && (
                <ul>
                  {job.responsibilities.map((role, index) => (
                    <li key={index} className="text-zinc-500">
                      <Markdown>{role}</Markdown>
                    </li>
                  ))}
                </ul>
              )}
            </header>
          </article>
        ))}
      </section>

      <section className="flex flex-col gap-7 -mx-8 px-8 md:mx-[-64px] md:px-16  pt-2">
        <header>
          <h2 className={`inline-block text-3xl ${font.className}`}>open source</h2>
        </header>

        <p className="md:pl-7 print:pl-7 text-zinc-300 print:text-zinc-700">
          <Markdown>{resume.openSource.description}</Markdown>
        </p>
      </section>
    </main>
  );
}
