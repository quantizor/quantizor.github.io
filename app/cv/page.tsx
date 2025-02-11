'use client';

import { FaGithub, FaLinkedin } from 'react-icons/fa';
import Markdown from 'markdown-to-jsx';
import resume from '@/resume.json';
import SiteTitle from '@/components/Title';

export default function CV() {
  return (
    <main>
      <SiteTitle>CV</SiteTitle>
      <header className="items-center print:items-start flex">
        <h1 className="print:opacity-100 opacity-60 text-xl">{resume.personalInfo.name}</h1>
        <p className="flex gap-4 items-center justify-end ml-auto print:hidden">
          <a
            className="opacity-50 print:opacity-100 hover:opacity-100"
            href={resume.profiles.x}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span aria-label="quantizor on X, the Everything App" className="text-[24px]">
              𝕏
            </span>
          </a>
          <a href={resume.profiles.github} target="_blank" rel="noopener noreferrer">
            <FaGithub aria-label="GitHub" className="h-5 w-5 print:opacity-100 opacity-50 hover:opacity-100" />
          </a>
          <a href={resume.profiles.linkedIn} target="_blank" rel="noopener noreferrer">
            <FaLinkedin aria-label="LinkedIn" className="h-5 w-5 print:opacity-100 opacity-50 hover:opacity-100" />
          </a>
        </p>
      </header>

      <blockquote>{resume.summary}</blockquote>

      <section className="flex flex-col gap-14 md:gap-7 print:gap-7">
        <header className="max-sm:mb-[-32px]">
          <h2 className="opacity-60 print:opacity-100">Professional Experience</h2>
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

      <section className="flex flex-col gap-7">
        <header>
          <h2 className="opacity-60 print:opacity-100">Open Source</h2>
        </header>

        <p className="md:pl-7 print:pl-7 text-zinc-300 print:text-zinc-700">{resume.openSource.description}</p>

        <ul className="md:pl-7 print:pl-7">
          {resume.openSource.projects.map((project) => (
            <li key={project.name}>
              <a className="underline" href={project.url}>
                {project.name}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <p>Thanks for reading, I look forward to hearing from you.</p>
    </main>
  );
}
