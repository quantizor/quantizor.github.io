import data from '@/resume.json';
import GithubIcon from 'simple-icons/icons/github.svg';
import LinkedInIcon from 'simple-icons/icons/linkedin.svg';
import XIcon from 'simple-icons/icons/x.svg';
import { For } from 'solid-js';

export default function CV() {
  return (
    <main class="text-zinc-100 flex flex-col gap-12 mx-auto lg:max-w-[50vw] px-8 md:px-16 py-10">
      <header class="flex">
        <h1 class="opacity-60 text-xl">{data.personalInfo.name}</h1>
        <p class="flex gap-4 align-middle justify-end ml-auto">
          <a href={data.profiles.x} target="_blank" rel="noopener noreferrer">
            <img aria-label="X" class="h-6 w-6 invert hue-rotate-90 hover:opacity-70" src={XIcon} />
          </a>
          <a href={data.profiles.github} target="_blank" rel="noopener noreferrer">
            <img aria-label="GitHub" class="h-6 w-6 invert hover:opacity-70" src={GithubIcon} />
          </a>
          <a href={data.profiles.linkedIn} target="_blank" rel="noopener noreferrer">
            <img aria-label="LinkedIn" src={LinkedInIcon} class="h-6 w-6 invert hover:opacity-70" />
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

        <p class="pl-7 text-zinc-300">{data.openSource.description}</p>

        <ul class="pl-7">
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
    </main>
  );
}
