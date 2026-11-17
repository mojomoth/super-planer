"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUp, BookOpen, ChevronRight, Folder, House, Leaf, MoveRight, Paperclip, Puzzle } from "lucide-react";
import { Logo } from "@/components/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const IDEA = "작은 숲속 마을에서 편지를 배달하는\n따뜻한 힐링 게임을 만들고 싶어.";

const GENRES = [
  { icon: Leaf, label: "힐링 시뮬레이션" },
  { icon: BookOpen, label: "스토리 어드벤처" },
  { icon: Puzzle, label: "캐주얼 퍼즐" },
];

const STEPS = ["아이디어", "질문과 답변", "기획 완성"];

export function PromptEntry() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex h-[69px] items-center border-b px-6">
        <Button asChild variant="ghost" className="size-10 rounded-md p-0">
          <Link href="/" aria-label="홈">
            <House strokeWidth={2.25} className="size-6" />
          </Link>
        </Button>
        <nav aria-label="브레드크럼" className="ml-[19px] flex items-center gap-3 text-[19px] font-[550]">
          <span>워크스페이스</span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </nav>
        <Button
          asChild
          variant="outline"
          className="ml-auto h-[46px] gap-3 rounded-[10px] bg-card px-[19px] text-[17px] font-[550] max-sm:px-3"
        >
          <Link href="/workflow">
            <Folder strokeWidth={2} className="size-[22px]" />
            <span className="max-sm:sr-only">내 프로젝트</span>
          </Link>
        </Button>
        <Avatar className="ml-[21px] size-9 after:border-0">
          <AvatarFallback className="bg-[#DCDDE3] text-[17px] font-semibold text-foreground">J</AvatarFallback>
        </Avatar>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 pt-[76px] pb-10">
        <Logo size={80} className="max-sm:h-auto max-sm:w-[320px]" />
        <h1 className="mt-[38px] text-center text-[60px] leading-[76px] font-bold">어떤 게임을 만들고 싶나요?</h1>
        <p className="mt-[11px] text-center text-[26.5px] leading-[36px] text-[#52525B]">
          떠오른 아이디어를 적어주세요. 질문을 나누며 기획을 구체화해요.
        </p>

        <div className="mt-[44px] flex h-[280px] w-full max-w-[1014px] flex-col rounded-[14px] border bg-card">
          <Textarea
            autoFocus
            ref={(el) => el?.setSelectionRange(el.value.length, el.value.length)}
            defaultValue={IDEA}
            placeholder="떠오른 아이디어를 적어주세요."
            aria-label="게임 아이디어"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                router.push("/questions");
              }
            }}
            className="field-sizing-fixed flex-1 resize-none rounded-none border-0 bg-transparent px-8 pt-[29px] text-[33px] leading-[38px] shadow-none focus-visible:ring-0 md:text-[33px]"
          />
          <div className="mx-4 flex h-[81px] items-center justify-between border-t">
            <Button
              variant="outline"
              className="h-[50px] gap-4 rounded-[10px] bg-card pr-6 pl-6 text-lg font-[550] hover:bg-zinc-50 max-sm:px-3"
            >
              <Paperclip strokeWidth={2} className="size-5 text-[#52525B]" />
              <span className="max-sm:sr-only">참고 자료</span>
            </Button>
            <Button
              asChild
              className="h-[52px] gap-3.5 rounded-[10px] px-[31px] text-lg font-bold hover:bg-[#4338CA]"
            >
              <Link href="/questions">
                <ArrowUp strokeWidth={2.25} className="size-5" />
                기획 시작
              </Link>
            </Button>
          </div>
        </div>

        <p className="mt-5 flex items-center gap-2 text-[18.5px] text-[#5B5A64]">
          <kbd className="inline-flex h-8 items-center rounded-[6px] border bg-secondary px-[10px] font-sans text-[17px] font-semibold text-[#565C6A]">
            Enter
          </kbd>
          를 눌러도 기획을 시작할 수 있어요.
        </p>

        <div className="mt-[28px] flex flex-wrap justify-center gap-[21px]">
          {GENRES.map(({ icon: Icon, label }) => (
            <Button
              key={label}
              variant="outline"
              className="h-[50px] gap-3.5 rounded-full bg-card px-6 text-[19px] font-[550] hover:border-zinc-300 hover:bg-zinc-50"
            >
              <Icon strokeWidth={1.75} className="size-6 text-[#40424A]" />
              {label}
            </Button>
          ))}
        </div>

        <ol className="mt-[54px] flex flex-wrap items-center justify-center gap-y-4">
          {STEPS.map((label, i) => (
            <li key={label} aria-current={i === 0 ? "step" : undefined} className="flex items-center">
              {i > 0 && <MoveRight strokeWidth={1.5} className="mx-[54px] size-7 max-sm:mx-3 text-[#7B7E8D]" />}
              <span
                className={
                  i === 0
                    ? "flex size-[42px] items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground"
                    : "flex size-[43px] items-center justify-center rounded-full border bg-card text-lg font-semibold text-[#5F5F70]"
                }
              >
                0{i + 1}
              </span>
              <span className={i === 0 ? "ml-4 text-[21px] font-semibold" : "ml-[18px] text-[21px] font-medium text-[#5A606B]"}>
                {label}
              </span>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
