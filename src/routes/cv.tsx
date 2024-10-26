import SiteTitle from '@/components/Title';
import data from '@/resume.json';
import { AiFillGithub as GithubIcon, AiFillLinkedin as LinkedInIcon } from 'solid-icons/ai';
import { For } from 'solid-js';

export default function CV() {
  return (
    <>
      <SiteTitle>CV</SiteTitle>

      <main>
        <header class="flex">
          <h1 class="opacity-60 text-xl">{data.personalInfo.name}</h1>
          <p class="flex gap-4 items-center justify-end ml-auto">
            <a class="opacity-50 hover:opacity-100" href={data.profiles.x} target="_blank" rel="noopener noreferrer">
              <span aria-label="Quantizor on X, the Everything App" class="text-[24px]">
                𝕏
              </span>
            </a>
            <a href={data.profiles.github} target="_blank" rel="noopener noreferrer">
              <GithubIcon aria-label="GitHub" class="h-5 w-5  opacity-50 hover:opacity-100" />
            </a>
            <a href={data.profiles.linkedIn} target="_blank" rel="noopener noreferrer">
              <LinkedInIcon aria-label="LinkedIn" class="h-5 w-5  opacity-50 hover:opacity-100" />
            </a>
          </p>
        </header>

        <blockquote>{data.summary}</blockquote>

        <section class="flex flex-col gap-14 md:gap-7">
          <header class="max-sm:mb-[-32px]">
            <h2 class="opacity-60">Professional Experience</h2>
          </header>

          <For each={data.workExperience}>
            {(job) => (
              <article class="md:pl-7">
                <header class="flex flex-col gap-6 md:gap-4">
                  <div class="flex flex-col md:flex-row gap-[2px] md:gap-4">
                    <h2 class="flex font-bold gap-3">
                      <a class="text-current underline-offset-3" href={job.url}>
                        {job.company}
                      </a>
                      <img src={job.icon} class="md:absolute w-4 h-4 max-sm:translate-y-1 md:ml-[-28px] md:mt-1" />
                    </h2>
                    <span class="italic text-zinc-200">{job.title}</span>
                    <span class="font-light md:ml-auto text-zinc-500">{job.period}</span>
                  </div>

                  <p class="text-zinc-300">{job.description}</p>

                  <ul>
                    <For each={job.responsibilities}>{(role) => <li class="text-zinc-500">{role}</li>}</For>
                  </ul>
                </header>
              </article>
            )}
          </For>
        </section>

        <section class="flex flex-col gap-7">
          <header>
            <h2 class="opacity-60">Open Source</h2>
          </header>

          <p class="md:pl-7 text-zinc-300">{data.openSource.description}</p>

          <ul class="md:pl-7">
            <For each={data.openSource.projects}>
              {(project) => (
                <li>
                  <a class="underline" href={project.url}>
                    {project.name}
                  </a>
                </li>
              )}
            </For>
          </ul>
        </section>

        <p>Thanks for reading, I look forward to hearing from you.</p>
      </main>
    </>
  );
}
