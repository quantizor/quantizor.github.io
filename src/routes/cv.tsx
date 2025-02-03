import SiteTitle from "@/components/Title";
import data from "@/resume.json";
import { compiler, type MarkdownToJSX } from "markdown-to-jsx";
import {
  AiFillGithub as GithubIcon,
  AiFillLinkedin as LinkedInIcon,
} from "solid-icons/ai";
import { For, Component, JSX } from "solid-js";
import h from "solid-js/h";

export default function CV() {
  return (
    <>
      <SiteTitle>CV</SiteTitle>

      <main>
        <header class="items-center print:items-start flex">
          <h1 class="print:opacity-100 opacity-60 text-xl">
            {data.personalInfo.name}
          </h1>
          <p class="flex gap-4 items-center justify-end ml-auto print:hidden">
            <a
              class="opacity-50 print:opacity-100 hover:opacity-100"
              href={data.profiles.x}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span
                aria-label="quantizor on X, the Everything App"
                class="text-[24px]"
              >
                𝕏
              </span>
            </a>
            <a
              href={data.profiles.github}
              target="_blank"
              rel="noopener noreferrer"
            >
              <GithubIcon
                aria-label="GitHub"
                class="h-5 w-5 print:opacity-100 opacity-50 hover:opacity-100"
              />
            </a>
            <a
              href={data.profiles.linkedIn}
              target="_blank"
              rel="noopener noreferrer"
            >
              <LinkedInIcon
                aria-label="LinkedIn"
                class="h-5 w-5 print:opacity-100  opacity-50 hover:opacity-100"
              />
            </a>
          </p>
        </header>

        <blockquote>{data.summary}</blockquote>

        <section class="flex flex-col gap-14 md:gap-7 print:gap-7">
          <header class="max-sm:mb-[-32px]">
            <h2 class="opacity-60 print:opacity-100">
              Professional Experience
            </h2>
          </header>

          <For each={data.workExperience}>
            {(job) => (
              <article class="md:pl-7 print:pl-7 print:break-inside-avoid-page">
                <header class="flex flex-col gap-6 md:gap-4 print:gap-4">
                  <div class="flex flex-col print:flex-row md:flex-row gap-[2px] md:gap-4 print:gap-4">
                    <h3 class="flex font-bold gap-3">
                      <a class="text-current underline-offset-3" href={job.url}>
                        {job.company}
                      </a>
                      <img
                        src={job.icon}
                        class="md:absolute print:absolute w-4 h-4 max-sm:translate-y-1 md:ml-[-28px] md:mt-1 print:ml-[-28px] print:mt-[1px]"
                      />
                    </h3>
                    <span class="italic text-zinc-200 print:text-zinc-800">
                      {job.title}
                    </span>
                    <span class="font-light md:ml-auto print:ml-auto text-zinc-500">
                      {job.period}
                    </span>
                  </div>

                  <p class="text-zinc-300 print:text-zinc-700">
                    {job.description}
                  </p>

                  <ul>
                    <For each={job.responsibilities}>
                      {(role) => (
                        <li class="text-zinc-500">
                          <MD>{role}</MD>
                        </li>
                      )}
                    </For>
                  </ul>
                </header>
              </article>
            )}
          </For>
        </section>

        <section class="flex flex-col gap-7">
          <header>
            <h2 class="opacity-60 print:opacity-100">Open Source</h2>
          </header>

          <p class="md:pl-7 print:pl-7 text-zinc-300 print:text-zinc-700">
            {data.openSource.description}
          </p>

          <ul class="md:pl-7 print:pl-7">
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

/**
 * A simple HOC for easy React use. Feed the markdown content as a direct child
 * and the rest is taken care of automatically.
 */
const MD: Component<{ children?: string }> = ({ children = "" }) => {
  if (process.env.NODE_ENV !== "production" && typeof children !== "string") {
    console.error(
      "markdown-to-jsx: <Markdown> component only accepts a single string as a child, received:",
      children
    );
  }

  return compiler(children, {
    createElement: h as unknown as NonNullable<
      MarkdownToJSX.Options["createElement"]
    >,
  }) as unknown as JSX.Element;
};
