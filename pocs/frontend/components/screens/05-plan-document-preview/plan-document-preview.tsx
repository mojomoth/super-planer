"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  CircleCheck,
  CircleHelp,
  Code,
  Download,
  Ellipsis,
  Eye,
  FileText,
  Footprints,
  Gamepad2,
  Gift,
  House,
  Layers,
  Mail,
  MessageCircle,
  Monitor,
  Mountain,
  GitFork,
  Palette,
  Plus,
  Settings,
  Sparkles,
  Upload,
  Users,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import banner from "./banner.png";

const PROJECTS = [
  { name: "달빛 우체국", icon: Mail, active: true },
  { name: "별빛 정원", icon: Gamepad2 },
  { name: "시간의 도서관", icon: Mountain },
];

const TOC = [
  { id: "overview", label: "프로젝트 개요", icon: FileText },
  { id: "core-play", label: "핵심 플레이", icon: Gamepad2 },
  { id: "world", label: "세계관과 스토리", icon: BookOpen },
  { id: "art", label: "아트 방향", icon: Palette },
  { id: "growth", label: "성장과 보상", icon: Gift },
];

const META = [
  { icon: Layers, label: "장르", value: "힐링 어드벤처" },
  { icon: Monitor, label: "플랫폼", value: "PC" },
  { icon: Users, label: "플레이", value: "싱글 플레이" },
];

const LOOP = [
  { icon: Mail, label: "편지 받기", w: 170 },
  { icon: Footprints, label: "마을 탐험", w: 160 },
  { icon: MessageCircle, label: "주민과 대화", w: 164 },
  { icon: Mail, label: "편지 전달", w: 164 },
];

// Sections below the draft's fold; long enough that the scroll thumb matches the draft (~197px).
const MORE = [
  {
    id: "art",
    n: "04",
    title: "아트 방향",
    intro: "달빛이 스며드는 따뜻한 밤 풍경을 중심으로, 부드러운 색감의 손그림 일러스트 스타일을 사용합니다.",
    parts: [
      ["색감과 분위기", "남색과 보라가 섞인 밤하늘을 기본 배경으로 두고, 창문 불빛과 등불에는 따뜻한 노란빛을 사용해 포근한 대비를 만듭니다. 채도는 전체적으로 낮게 유지해 오래 플레이해도 눈이 편안하도록 합니다."],
      ["캐릭터", "주민들은 숲속 동물을 모티프로 한 2등신 캐릭터로 표현합니다. 둥근 실루엣과 단순한 표정으로 각자의 성격이 한눈에 드러나도록 하고, 계절마다 옷차림이 조금씩 바뀝니다."],
      ["배경과 장소", "우체국, 호숫가, 언덕 위 등대, 버섯 숲 등 마을의 주요 장소는 각각 고유한 색 테마를 가집니다. 화면 전환 없이 이어지는 하나의 마을 지도로 구성해 걸어서 탐험하는 즐거움을 살립니다."],
      ["빛과 시간", "게임 속 시간은 해 질 녘에서 새벽까지 흐르며, 시간대에 따라 달빛의 각도와 그림자의 길이가 달라집니다. 보름달이 뜨는 밤에는 특별한 편지와 이벤트가 등장합니다."],
      ["계절 변화", "봄에는 벚꽃잎, 여름에는 반딧불, 가을에는 낙엽, 겨울에는 눈이 마을을 덮습니다. 계절마다 같은 장소도 색과 소품이 달라져 익숙한 길을 다시 걷는 재미를 줍니다."],
      ["UI 스타일", "편지지와 우표, 소인 같은 우편 소품을 UI 요소로 활용합니다. 버튼과 창은 종이 질감을 살린 부드러운 모서리로 만들고, 손글씨 느낌의 서체는 제목에만 사용합니다."],
      ["사운드", "잔잔한 피아노와 오르골 선율을 기본으로, 풀벌레 소리와 바람 소리 같은 환경음을 겹쳐 밤 마을의 고요함을 전합니다. 주민마다 짧은 테마 멜로디를 가집니다."],
      ["레퍼런스", "그림책 같은 질감의 2D 일러스트 게임을 주요 레퍼런스로 삼습니다. 선은 얇고 부드럽게, 그림자는 단색 면으로 단순하게 처리해 동화책을 넘기는 듯한 인상을 줍니다."],
    ],
  },
  {
    id: "growth",
    n: "05",
    title: "성장과 보상",
    intro: "편지를 전할 때마다 주민과의 친밀도가 오르고, 마을 곳곳에 새로운 장소와 이야기가 열립니다.",
    parts: [
      ["하루의 흐름", "하루는 아침에 우체국에서 편지를 받는 것으로 시작해, 밤이 깊어지면 집으로 돌아가 답장을 읽는 것으로 마무리됩니다. 하루에 전할 수 있는 편지 수는 정해져 있지 않습니다."],
      ["친밀도", "주민마다 다섯 단계의 친밀도가 있으며, 편지를 전하고 대화를 나눌수록 단계가 오릅니다. 단계가 오를 때마다 주민의 새로운 사연과 부탁이 열립니다."],
      ["우체국 성장", "배달을 마칠 때마다 우체국에 작은 별 조각이 모입니다. 별 조각으로 우체국을 꾸미거나 배달 가방, 자전거 같은 도구를 업그레이드할 수 있습니다."],
      ["새로운 장소", "특정 주민과 가까워지면 그 주민만 아는 숲길이나 비밀 장소가 지도에 나타납니다. 새로운 장소에는 처음 만나는 주민과 아직 전하지 못한 편지가 기다리고 있습니다."],
      ["수집 요소", "편지에 붙은 우표와 주민들이 건네는 작은 선물은 수집 앨범에 모입니다. 앨범의 한 페이지를 채울 때마다 마을 광장에 기념 장식이 하나씩 늘어납니다."],
      ["답장과 기록", "전한 편지와 받은 답장은 모두 배달 일지에 기록됩니다. 일지를 다시 읽으며 주민들의 이야기가 어떻게 이어져 왔는지 돌아볼 수 있습니다."],
      ["실패 없는 진행", "배달 시간 제한이나 실패 조건은 두지 않습니다. 플레이어는 원하는 속도로 마을을 둘러보며, 늦게 도착한 편지에도 주민들은 반갑게 답장을 보냅니다."],
      ["엔딩과 이후", "모든 주민의 이야기를 마치면 달빛 축제가 열리며 첫 번째 엔딩을 맞습니다. 엔딩 이후에도 계절이 바뀌며 새로운 주민과 편지가 계속 찾아옵니다."],
    ],
  },
];

const MARKDOWN = `# 달빛 우체국
숲속 마을에서 전하는 작은 마음들

## 01 프로젝트 개요
작은 숲속 마을을 배경으로 편지를 전하며 사람들의 마음을 이어가는 힐링 어드벤처 게임입니다.
다양한 주민들에게 편지를 배달하고, 그 과정에서 각자의 이야기를 들으며 마음의 일상을 조금씩 변화시켜 나갑니다.

- **장르:** 힐링 어드벤처
- **플랫폼:** PC
- **플레이:** 싱글 플레이

## 02 핵심 플레이
편지 받기 → 마을 탐험 → 주민과 대화 → 편지 전달

## 03 세계관과 스토리
달빛이 비추는 작은 숲속 마을 '달빛 마을'이 배경입니다. 마을의 우체국을 거점으로, 플레이어는 우편 배달원이 되어
주민들에게 편지를 전하고, 편지에 담긴 사연을 통해 마을 사람들의 소소하고 따뜻한 이야기를 만나게 됩니다.
${MORE.map((s) => `\n## ${s.n} ${s.title}\n${s.intro}\n${s.parts.map(([h, p]) => `\n### ${h}\n${p}\n`).join("")}`).join("")}`;

export function PlanDocumentPreview() {
  const [view, setView] = useState<"preview" | "markdown">("preview");

  return (
    <div className="flex h-screen bg-[#f9f9fd] tracking-[0.05em] text-[#0b0d17]">
      <aside className="flex w-[263px] shrink-0 flex-col border-r border-[#e9eaf2] bg-[#f8f9fd]">
        <div className="h-[61px] shrink-0 border-b border-[#e7e9f1] pt-[11px] pl-[25px]">
          <Logo size={38} />
        </div>
        <div className="px-[13px] pt-[17px]">
          <Button
            variant="outline"
            className="h-[43px] w-full gap-[12px] border-[#dfe2ea] bg-white text-base font-medium text-[#0b0d17] hover:bg-[#f4f4f8] [&_svg:not([class*='size-'])]:size-[22px]"
          >
            <Plus strokeWidth={1.5} />새 프로젝트
          </Button>
        </div>
        <p className="mt-[34px] pl-[19px] text-base leading-6 text-[#363c4e]">내 프로젝트</p>
        <ul className="mt-[12px] flex flex-col gap-[2.5px] px-[13px]">
          {PROJECTS.map(({ name, icon: Icon, active }) => (
            <li
              key={name}
              className={cn(
                "flex h-[44px] items-center gap-[14px] rounded-lg pr-3 pl-[17px] text-base",
                active ? "bg-[#ebebfd] font-semibold text-[#1e1b4b]" : "font-medium text-[#1e1f2e] hover:bg-[#f1f1f8]",
              )}
            >
              <Icon className={cn("size-[21px]", active ? "text-[#4338ca]" : "text-[#484e64]")} strokeWidth={1.75} />
              <span className="flex-1">{name}</span>
              <button type="button" aria-label={`${name} 메뉴`}>
                <Ellipsis className={cn("size-[22px]", active ? "text-[#4f46e5]" : "text-[#494d5f]")} />
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-auto px-[17px] pb-[22px]">
          <div className="h-px bg-[#eff0f6]" />
          {[
            { label: "설정", icon: Settings },
            { label: "도움말", icon: CircleHelp },
          ].map(({ label, icon: Icon }, i) => (
            <button
              key={label}
              type="button"
              className={cn("flex h-[38px] w-full items-center gap-[12px] pl-[15px] text-base font-medium", i === 0 && "mt-[14px]")}
            >
              <Icon className="size-[22px] text-[#484e64]" strokeWidth={1.75} />
              {label}
            </button>
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[61px] shrink-0 items-center border-b border-[#e7e9f1] pr-[23px] pl-[27px]">
          <Link href="/" aria-label="홈">
            <House className="size-[21px]" strokeWidth={1.75} />
          </Link>
          <nav aria-label="breadcrumb" className="ml-[20px] flex items-center gap-[14px] text-base">
            <Link href="/" className="text-[#2d3343] hover:text-[#0b0d17]">
              프로젝트
            </Link>
            <span className="text-[#7b8090]">/</span>
            <span aria-current="page" className="font-medium">
              달빛 우체국
            </span>
          </nav>
          <span className="ml-auto flex items-center gap-[7px] text-[15px] text-[#424658]">
            <CircleCheck className="size-[18px] text-[#16a34a]" strokeWidth={1.75} />
            저장됨 (지금)
          </span>
          <Button
            variant="outline"
            className="ml-[28px] h-10 w-[121px] gap-[10px] border-[#dfe1e9] bg-white text-base font-semibold text-[#0b0d17] hover:bg-[#f4f4f8] [&_svg:not([class*='size-'])]:size-[20px]"
          >
            <Upload strokeWidth={1.75} />
            내보내기
          </Button>
          <Button className="ml-[21px] h-10 w-[142px] gap-[10px] text-base font-semibold hover:bg-[#4338ca] [&_svg:not([class*='size-'])]:size-[18px]">
            <Sparkles strokeWidth={1.75} />
            기획서 생성
          </Button>
          <Avatar className="ml-[22px] size-[30px] after:hidden">
            <AvatarFallback className="bg-[#dfe1e8] text-[13px] font-bold text-[#0b0d17]">J</AvatarFallback>
          </Avatar>
        </header>

        <main className="flex min-h-0 flex-1 flex-col px-[28px] pt-[17px] pb-[17px]">
          <div className="flex items-center gap-[22px] pl-[14px]">
            <div className="flex size-[62px] items-center justify-center rounded-xl bg-[#e5e5fe]">
              <Mail className="size-[31px] text-[#4338ca]" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="mt-[2px] text-[30px] leading-[36px] font-bold">달빛 우체국</h1>
              <p className="mt-px text-base leading-6 text-[#3f4355]">숲속 마을에 편지를 전하며 마음을 잇는 힐링 어드벤처</p>
            </div>
          </div>

          <nav className="mt-[17px] flex gap-[17px] border-b border-[#e8eaf1] pl-[9px] text-base">
            <Link href="/workflow" className="flex h-[44px] items-center gap-[10px] px-[18px] text-[#444759] hover:text-[#0b0d17]">
              <GitFork className="size-[19px] rotate-180 text-[#484e64]" strokeWidth={1.75} />
              워크플로우
            </Link>
            <span
              aria-current="page"
              className="-mb-px flex h-[45px] items-center gap-[11px] border-b-[3px] border-[#4f46e5] pr-[18px] pl-[15px] font-semibold text-[#4338ca]"
            >
              <FileText className="size-[21px] text-[#4f46e5]" strokeWidth={1.75} />
              기획서
            </span>
          </nav>

          <div className="mt-[19px] flex min-h-0 flex-1 gap-[12px]">
            <nav className="w-[220px] shrink-0 rounded-xl border border-[#e9eaf0] bg-[#fbfbfd] px-[12px] pt-[15px]">
              <h2 className="pl-[5px] text-[17px] leading-6 font-bold">목차</h2>
              <ul className="mt-[16px] flex flex-col gap-[3.5px]">
                {TOC.map(({ id, label, icon: Icon }, i) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className={cn(
                        "flex h-10 items-center gap-[9px] rounded-lg pl-[12px] text-base",
                        i === 0 ? "bg-[#eaeafc] font-semibold text-[#4338ca]" : "text-[#262735] hover:bg-[#f1f1f8]",
                      )}
                    >
                      <Icon className={cn("size-[21px]", i === 0 ? "text-[#4f46e5]" : "text-[#484e64]")} strokeWidth={1.75} />
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#e6e8ef]">
              <div className="flex h-[52px] shrink-0 items-center border-b border-[#e5e7ee] bg-[#fcfcfe] pr-[13px] pl-[13px]">
                <div className="flex h-[38px] w-[275px] rounded-lg border border-[#dfe0ea] bg-white p-[2px] text-[15px]">
                  <button
                    type="button"
                    aria-pressed={view === "preview"}
                    onClick={() => setView("preview")}
                    className={cn(
                      "flex w-[126px] items-center justify-center gap-[12px] rounded-md",
                      view === "preview" ? "bg-[#eeeefe] font-semibold text-[#4338ca]" : "font-medium text-[#373d52]",
                    )}
                  >
                    <Eye className={cn("size-[21px]", view === "preview" ? "text-[#4f46e5]" : "text-[#484e64]")} strokeWidth={1.75} />
                    미리보기
                  </button>
                  <button
                    type="button"
                    aria-pressed={view === "markdown"}
                    onClick={() => setView("markdown")}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-[9px] rounded-md pl-[10px] tracking-normal",
                      view === "markdown" ? "bg-[#eeeefe] font-semibold text-[#4338ca]" : "font-medium text-[#373d52]",
                    )}
                  >
                    <Code className={cn("size-[20px]", view === "markdown" ? "text-[#4f46e5]" : "text-[#484e64]")} strokeWidth={1.75} />
                    Markdown
                  </button>
                </div>
                <span className="mb-1 ml-auto flex h-7 w-[45px] items-center justify-center rounded-full bg-[#e6e5fd] text-sm font-bold text-[#4338ca]">
                  v1.0
                </span>
                <span className="mb-1 ml-[27px] flex items-center gap-[10px] text-[15px] tracking-[0.03em] text-[#3f4356]">
                  <CircleCheck className="size-[17px] text-[#16a34a]" strokeWidth={1.75} />
                  결정 사항 6개 반영
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="다운로드"
                  className="ml-[39px] h-[38px] w-[46px] border-[#dddfe7] bg-white hover:bg-[#f4f4f8] [&_svg:not([class*='size-'])]:size-[18px]"
                >
                  <Download className="size-5 text-[#0b0d17]" strokeWidth={1.75} />
                </Button>
              </div>

              {/* Always-visible draft scrollbar; no scrollbar-width/color (Chrome ignores ::-webkit-scrollbar when set). Gutter on both edges keeps the article centered. */}
              <div className="min-h-0 flex-1 overflow-y-auto bg-[#f5f5fa] pt-[16px] [scrollbar-gutter:stable_both-edges] [&::-webkit-scrollbar]:w-[12px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-[#bebfc5] [&::-webkit-scrollbar-thumb]:bg-clip-padding [&::-webkit-scrollbar-track]:bg-[#fbfbfd]">
                {view === "preview" ? <Document /> : (
                  <pre className="mx-auto w-[916px] rounded-lg border border-[#dfe1e9] bg-white px-12 py-7 font-mono text-sm leading-6 whitespace-pre-wrap text-[#282938]">
                    {MARKDOWN}
                  </pre>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function SectionTitle({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <h2 className="flex gap-[15px] text-[23px] leading-[30px] font-bold">
      <span className="text-[#4f46e5]">{n}</span>
      {children}
    </h2>
  );
}

function Document() {
  return (
    <article className="mx-auto mb-[16px] w-[916px] rounded-lg border border-[#dfe1e9] bg-white pt-[25px] tracking-[0.032em] pr-[42px] pb-12 pl-[47px]">
      <div className="flex items-center justify-between text-[13px] leading-[18px]">
        <span className="font-medium tracking-normal text-[#4f5568] uppercase">Game Design Document</span>
        <span className="text-sm leading-[18px] text-[#515769]">기획 초안 · v1.0</span>
      </div>
      <h1 className="mt-[6px] text-[38px] leading-[44px] font-extrabold">달빛 우체국</h1>
      <p className="mt-[4px] text-[18.5px] leading-6 text-[#33384b]">숲속 마을에서 전하는 작은 마음들</p>
      <Image src={banner} alt="달빛 우체국 배너" className="mt-[15px] h-[172px] w-full rounded-[10px] object-cover" priority />

      <section id="overview" className="mt-[18px] scroll-mt-4">
        <div className="flex items-center justify-between">
          <SectionTitle n="01">프로젝트 개요</SectionTitle>
          <span className="flex h-6 items-center gap-[6px] rounded-full border border-[#d4ebdd] bg-[#e8f9ef] px-[10px] text-[13px] font-medium text-[#15803d]">
            <Check className="size-[17px] text-[#16a34a]" strokeWidth={2} />
            핵심 플레이 · 결정 완료
          </span>
        </div>
        <p className="mt-[6px] text-[15px] leading-[20px] text-[#282938]">
          작은 숲속 마을을 배경으로 편지를 전하며 사람들의 마음을 이어가는 힐링 어드벤처 게임입니다.
          <br />
          다양한 주민들에게 편지를 배달하고, 그 과정에서 각자의 이야기를 들으며 마음의 일상을 조금씩 변화시켜 나갑니다.
        </p>
        <ul className="mt-[10px] grid grid-cols-3 gap-[18px]">
          {META.map(({ icon: Icon, label, value }) => (
            <li
              key={label}
              className="flex h-10 items-center gap-[14px] rounded-md border border-[#e4e6ec] bg-white pl-[14px] text-[15px] text-[#0c0c19] shadow-sm"
            >
              <Icon className="size-[19px] text-[#394155]" strokeWidth={1.75} />
              <span>
                <b className="font-bold">{label}:</b> {value}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section id="core-play" className="mt-[23px] scroll-mt-4">
        <SectionTitle n="02">핵심 플레이</SectionTitle>
        <div className="mt-[11px] flex items-center justify-between">
          {LOOP.map(({ icon: Icon, label, w }, i) => (
            <div key={i} className="contents">
              {i > 0 && <ArrowRight className="size-[26px] text-[#4e536b]" strokeWidth={1.5} />}
              <div
                style={{ width: w }}
                className="flex h-[43px] items-center justify-center gap-[14px] rounded-full border border-[#e6e5f2] bg-[#f1f1fe] text-[15px] font-semibold"
              >
                <Icon className="size-[23px] text-[#1e1b4b]" strokeWidth={1.75} />
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="world" className="mt-[27px] scroll-mt-4">
        <SectionTitle n="03">세계관과 스토리</SectionTitle>
        <p className="mt-[6px] text-[15px] leading-[20px] text-[#282938]">
          달빛이 비추는 작은 숲속 마을 &apos;달빛 마을&apos;이 배경입니다. 마을의 우체국을 거점으로, 플레이어는 우편 배달원이 되어
          <br />
          주민들에게 편지를 전하고, 편지에 담긴 사연을 통해 마을 사람들의 소소하고 따뜻한 이야기를 만나게 됩니다.
        </p>
      </section>

      {MORE.map(({ id, n, title, intro, parts }) => (
        <section key={id} id={id} className="mt-[26px] scroll-mt-4">
          <SectionTitle n={n}>{title}</SectionTitle>
          <p className="mt-[6px] text-[15px] leading-[20px] text-[#282938]">{intro}</p>
          {parts.map(([h, p]) => (
            <div key={h} className="mt-[18px]">
              <h3 className="text-[17px] leading-6 font-semibold">{h}</h3>
              <p className="mt-[4px] text-[15px] leading-[24px] text-[#282938]">{p}</p>
            </div>
          ))}
        </section>
      ))}
    </article>
  );
}
