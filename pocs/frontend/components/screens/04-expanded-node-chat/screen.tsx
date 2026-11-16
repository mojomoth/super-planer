import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleCheck,
  Ellipsis,
  ExternalLink,
  FileText,
  Folder,
  Gamepad2,
  House,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Leaf,
  Lightbulb,
  List,
  Map as MapIcon,
  MessageCircle,
  Minus,
  Paperclip,
  Plus,
  Scan,
  SendHorizontal,
  Settings,
  Sparkles,
  Sprout,
  Undo2,
  Upload,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PROJECTS = [
  { name: "달빛 우체국", icon: Leaf, active: true },
  { name: "별의 정원", icon: Folder },
  { name: "바다의 도서관", icon: Folder },
];

const MENU = [
  { name: "AI 채팅", icon: MessageCircle },
  { name: "참고 자료", icon: BookOpen },
  { name: "템플릿", icon: LayoutGrid },
  { name: "설정", icon: Settings },
];

const TABS = [
  { name: "아이디어", icon: Lightbulb, href: "/" },
  { name: "워크플로우", icon: Workflow, href: "/workflow", active: true },
  { name: "질문과 답변", icon: BookOpen, href: "/questions" },
  { name: "기획서", icon: FileText, href: "/document" },
];

const FLOW = ["편지 받기", "마을 탐험", "주민과 대화", "편지 전달"];

const REFERENCES = [
  { label: "마을 탐험 레퍼런스", src: "/screens/04-expanded-node-chat/ref-village.png" },
  { label: "주민과의 대화", src: "/screens/04-expanded-node-chat/ref-dialogue.png" },
];

const iconBtn = "size-[30px] rounded-md border border-[#E5E7EE] bg-white text-[#353D4F] hover:bg-[#F4F5F8]";

export function Screen() {
  return (
    <div className="flex h-svh overflow-hidden text-[#111322]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <TabBar />
        <Canvas />
      </div>
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="flex w-[253px] shrink-0 flex-col border-r border-[#EAEBF1] bg-[#F9F9FC] px-[11px]">
      <div className="pt-4 pl-[13px]">
        <Logo size={34} />
      </div>
      <NavRow icon={House} label="워크스페이스" className="mt-[28px]" />
      <hr className="mt-[11px] border-[#EEF0F4]" />
      <div className="mt-[13px] flex items-center justify-between pl-[15px] pr-[7px]">
        <span className="text-[16.5px] font-semibold">프로젝트</span>
        <Button variant="outline" size="icon" className="size-[30px] rounded-lg border-[#DFE1E8] bg-white hover:bg-[#F4F5F8]" aria-label="프로젝트 추가">
          <Plus className="size-4" />
        </Button>
      </div>
      <nav className="mt-[11px] flex flex-col gap-[3px]">
        {PROJECTS.map((p) => (
          <NavRow key={p.name} icon={p.icon} label={p.name} active={p.active} href={p.active ? "/workflow" : undefined} />
        ))}
      </nav>
      <hr className="mt-[17px] border-[#EEF0F4]" />
      <nav className="mt-[15px] flex flex-col gap-1.5">
        {MENU.map((m) => (
          <NavRow key={m.name} icon={m.icon} label={m.name} />
        ))}
      </nav>
      <hr className="mt-auto border-[#EEF0F4]" />
      <button className="mb-5 mt-[10px] flex h-9 items-center rounded-lg pl-[11px] pr-3 text-left hover:bg-[#EFEFF5]">
        <span className="grid size-9 place-items-center rounded-full bg-[#D6D9DF] text-[15px] font-bold">J</span>
        <span className="ml-[14px] flex-1 text-[16.5px] font-medium">내 계정</span>
        <ChevronDown className="size-5 text-[#5B5F6C]" />
      </button>
    </aside>
  );
}

function NavRow({ icon: Icon, label, active, href = "#", className }: { icon: LucideIcon; label: string; active?: boolean; href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-10 items-center gap-[17px] rounded-lg px-5 text-[16.5px] font-medium",
        active ? "bg-[#E4E3FE] font-semibold" : "hover:bg-[#EFEFF5]",
        className,
      )}
    >
      <Icon className="size-[22px] text-[#2B2F3B]" strokeWidth={1.75} />
      {label}
    </Link>
  );
}

function TopBar() {
  return (
    <header className="flex h-[58px] shrink-0 items-center border-b border-[#EFF0F4] bg-[#FAFBFD] pl-[35px] pr-[19px]">
      <button className="flex items-center gap-4 rounded-lg">
        <Leaf className="size-6 text-[#2B2F3B]" strokeWidth={1.75} />
        <span className="flex items-center gap-1.5 text-[23px] font-bold">
          달빛 우체국
          <ChevronDown className="size-[23px] text-[#3F4451]" strokeWidth={1.75} />
        </span>
      </button>
      <span className="ml-[25px] h-5 w-px bg-[#C9CAD3]" />
      <p className="ml-[23px] text-[17.5px] text-[#454855]">숲속 마을에 편지를 전하며 마음을 잇는 힐링 어드벤처</p>
      <Button variant="ghost" size="icon" className="ml-auto mr-[22px] text-[#232938] hover:bg-[#EFEFF5]" aria-label="더보기">
        <Ellipsis className="size-[22px]" />
      </Button>
      <Button variant="outline" className="h-[38px] w-[92px] gap-2 rounded-lg border-[#DDDFE7] bg-[#FCFDFE] text-[17px] font-medium hover:bg-[#F4F5F8]">
        <Upload className="size-[18px]" />
        공유
      </Button>
      <Button asChild className="ml-[17px] h-[39px] w-36 gap-2 rounded-lg text-[16.5px] font-semibold hover:bg-[#4338CA]">
        <Link href="/document">
          <Sparkles className="size-[18px]" />
          기획서 생성
        </Link>
      </Button>
    </header>
  );
}

function TabBar() {
  return (
    <div className="flex h-[53px] shrink-0 items-stretch border-b border-[#E4E6EC] bg-[#FAFBFD] pl-[23px] pr-6 pt-1">
      <nav className="flex gap-[17px]">
        {TABS.map((t) => (
          <Link
            key={t.name}
            href={t.href}
            className={cn(
              "relative flex items-center gap-3 px-3.5 text-[17px] font-medium",
              t.active ? "font-semibold text-[#4F46E5]" : "text-[#444857] hover:text-[#111322]",
            )}
          >
            <t.icon className="size-[22px]" strokeWidth={1.75} />
            {t.name}
            {t.active && <span className="absolute inset-x-0 bottom-0 h-[3px] bg-[#4F46E5]" />}
          </Link>
        ))}
      </nav>
      <div className="ml-auto flex items-center">
        <Button variant="outline" size="icon" className={iconBtn} aria-label="축소">
          <Minus className="size-5" strokeWidth={1.75} />
        </Button>
        <span className="mx-4 text-[15px] font-medium text-[#3E4252]">100%</span>
        <Button variant="outline" size="icon" className={iconBtn} aria-label="확대">
          <Plus className="size-5" strokeWidth={1.75} />
        </Button>
        <span className="mx-[19px] h-[18px] w-px bg-[#D6D8DE]" />
        <Button variant="outline" size="icon" className={iconBtn} aria-label="화면 맞춤">
          <Scan className="size-5" strokeWidth={1.75} />
        </Button>
        <Button variant="outline" size="icon" className={cn(iconBtn, "ml-[19px] bg-[#F7F7F9]")} aria-label="미니맵">
          <MapIcon className="size-5" strokeWidth={1.75} />
        </Button>
      </div>
    </div>
  );
}

// Canvas coordinates are absolute like a real node editor; origin = canvas top-left.
function Canvas() {
  return (
    <main className="relative flex-1 bg-[#FBFCFE] bg-[radial-gradient(#E4E5EA_1px,transparent_1.2px)] bg-size-[18px_18px]">
      <svg className="absolute inset-0 size-full" fill="none" stroke="#B6B9C4" strokeWidth={2} strokeLinecap="round">
        <path d="M311 390 H333" />
        <path d="M348 375 V371 Q348 359 360 359 H378" />
        <path d="M1028 359 H1048 Q1060 359 1060 371 V375" />
        <path d="M1075 390 H1101" />
      </svg>
      <AddButton className="left-[333px] top-[375px]" />
      <AddButton className="left-[1047px] top-[375px]" />
      <NodeCard
        className="left-[35px] top-[239px] w-[277px]"
        icon={Sprout}
        title="게임 개요"
        desc="게임의 콘셉트와 기본 정보를 정리해요."
        items={["게임 콘셉트", "장르 및 분위기", "핵심 키워드"]}
        done
      />
      <NodeCard
        className="left-[1101px] top-[238px] w-[295px]"
        icon={Layers}
        title="콘텐츠 구성"
        desc="게임에 들어갈 주요 콘텐츠를 구성해요."
        items={["주요 시스템", "콘텐츠 목록", "분량 및 구조"]}
      />
      <ExpandedPanel />
    </main>
  );
}

function AddButton({ className }: { className: string }) {
  return (
    <Button variant="outline" size="icon" className={cn("absolute size-7 rounded-full border-[#D0D4D8] bg-white text-[#575B6D] hover:bg-[#F4F5F8]", className)} aria-label="노드 추가">
      <Plus className="size-3.5" />
    </Button>
  );
}

function NodeCard({ className, icon: Icon, title, desc, items, done }: { className: string; icon: LucideIcon; title: string; desc: string; items: string[]; done?: boolean }) {
  return (
    <section className={cn("absolute h-[277px] rounded-[14px] border border-[#CED1DA] bg-white px-[17px] pt-4 shadow-[0_8px_24px_-10px_rgba(30,35,60,.12)]", className)}>
      <div className="flex items-center">
        <span className="grid size-10 place-items-center rounded-[10px] bg-[#E4E2FD]">
          <Icon className="size-[22px] text-[#2B2D3B]" strokeWidth={1.75} />
        </span>
        <h3 className="ml-4 flex-1 text-[21.5px] font-bold">{title}</h3>
        {done ? <CircleCheck className="size-[22px] text-[#4CAF8A]" strokeWidth={1.75} /> : <span className="size-[22px] rounded-full border-[1.5px] border-[#B3B5C1]" />}
      </div>
      <p className="mt-[14px] px-[5px] text-[18px] leading-6 text-[#5B5F6C]">{desc}</p>
      <ul className="mt-[15px] border-t border-[#ECEEF1]">
        {items.map((item) => (
          <li key={item} className="flex h-[39px] items-center gap-[14px] border-b border-[#ECEEF1] pl-[7px] text-[16px] font-medium last:border-b-0">
            {done ? (
              <span className="grid size-[22px] place-items-center rounded-full bg-[#E2E3E9]">
                <Check className="size-3 text-[#5A6174]" strokeWidth={2.5} />
              </span>
            ) : (
              <span className="mr-0.5 size-[18px] rounded border border-[#C6C8D2]" />
            )}
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ExpandedPanel() {
  return (
    <section className="absolute left-[378px] top-[26px] flex h-[761px] w-[650px] flex-col rounded-2xl border border-t-[3px] border-[#CED1DA] border-t-[#4F46E5] bg-white px-[21px] pt-[19px] shadow-[0_12px_32px_-10px_rgba(30,35,60,.14),0_2px_6px_rgba(30,35,60,.04)]">
      <header className="flex pl-1 pr-[5px]">
        <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-[#E0DEFC]">
          <Gamepad2 className="size-[26px] text-[#252643]" strokeWidth={1.75} />
        </span>
        <div className="ml-[15px] flex-1 pt-px">
          <div className="flex h-[30px] items-center">
            <h2 className="text-[21.5px] font-bold">핵심 플레이</h2>
            <span className="ml-[17px] rounded-full bg-[#E5E4FD] px-[14px] py-[3px] text-[15px] font-semibold text-[#3730DD]">진행 중</span>
            <Link href="/workflow" className="ml-auto grid size-7 place-items-center rounded-md text-[#2B3345] hover:bg-[#EFEFF5]" aria-label="접기">
              <ChevronUp className="size-6" strokeWidth={1.75} />
            </Link>
            <button className="ml-[13px] grid size-7 place-items-center rounded-md text-[#2B3345] hover:bg-[#EFEFF5]" aria-label="더보기">
              <Ellipsis className="size-6" />
            </button>
          </div>
          <p className="mt-1.5 text-[16px] leading-5 text-[#5B5F6C]">편지 배달의 재미와 하루의 흐름을 정해요.</p>
        </div>
      </header>
      <hr className="mt-[17px] border-[#EEEFF3]" />

      <div className="mt-[9px] flex flex-col pl-1 pr-[3px]">
        <AiMessage text="편지를 배달하는 과정에서 어떤 재미가 있으면 좋을까요?" />
        <div className="mt-[14px] flex items-center justify-end gap-[11px]">
          <p className="rounded-xl bg-[#E6E5FD] px-5 text-[17px] leading-10">마을을 탐험하고 주민의 이야기를 듣고 싶어.</p>
          <span className="grid size-9 place-items-center rounded-full bg-[#D9DBE1] text-[15px] font-bold">J</span>
        </div>
        <AiMessage className="mt-[15px]" text="탐험과 대화를 중심으로 하루의 흐름을 잡아볼게요." />
        <div className="ml-[52px] mt-2 flex h-[44px] items-center rounded-[10px] border border-[#E4E6EC] bg-[#F8F9FB] pl-[18px] text-[16px] font-bold">
          <List className="mr-5 size-[18px] text-[#3B3F50]" />
          {FLOW.map((step, i) => (
            <span key={step} className="flex items-center">
              {i > 0 && <ArrowRight className="mx-3 size-3.5 text-[#3B3F50]" strokeWidth={2.5} />}
              {step}
            </span>
          ))}
        </div>
      </div>
      <hr className="mt-[19px] border-[#EDEFF3]" />

      <div className="mt-3 flex h-5 items-center pl-1">
        <ImageIcon className="size-[18px] text-[#222937]" />
        <span className="ml-2.5 text-[15.5px] font-semibold">참고 자료</span>
        <div className="ml-auto mr-[9px] flex items-center text-[#414B5C]">
          <ChevronLeft className="size-4" />
          <span className="ml-3.5 size-2 rounded-full bg-[#4F46E5]" />
          <span className="ml-1.5 size-2 rounded-full bg-[#E1E2E8]" />
          <span className="ml-1.5 size-2 rounded-full bg-[#D6D9E3]" />
          <ChevronRight className="ml-3.5 size-4" />
        </div>
      </div>
      <div className="mt-[13px] grid grid-cols-2 gap-[10px] pl-1 pr-0.5">
        {REFERENCES.map((r) => (
          <a key={r.label} href="#" className="overflow-hidden rounded-[10px] border border-[#E3E5EC] bg-white hover:border-[#CED1DA]">
            {/* eslint-disable-next-line @next/next/no-img-element -- static mock crop from the draft */}
            <img src={r.src} alt="" className="h-[124px] w-full object-cover" />
            <div className="flex h-[43px] items-center justify-between pl-4 pr-4 text-[16px] font-semibold">
              {r.label}
              <ExternalLink className="size-[18px] text-[#505567]" />
            </div>
          </a>
        ))}
      </div>

      <div className="mt-4 flex h-[70px] items-center gap-[14px] rounded-[10px] border border-[#E2E1F9] bg-[#F0EFFE] pl-[17px]">
        <CircleCheck className="size-[26px] text-[#4F46E5]" strokeWidth={1.75} />
        <div className="text-[17px] leading-[26px]">
          <p className="text-[16.5px] font-bold text-[#4338E5]">결정 사항</p>
          <p className="text-[#1A1A27]">배달 한 번에 10~15분 <span className="mx-1">·</span> 탐험과 대화 중심</p>
        </div>
      </div>

      <div className="mt-[13px] flex h-[52px] items-center rounded-[10px] border border-[#E0E2E8] bg-white pr-[5px] focus-within:border-[#4F46E5]">
        <input
          className="h-full flex-1 bg-transparent pl-[15px] text-[17px] outline-none placeholder:text-[#7A7E8B]"
          placeholder="이 결정에 대해 더 이야기해보세요..."
        />
        <button className="grid size-8 place-items-center rounded-md text-[#4E505D] hover:bg-[#EFEFF5]" aria-label="파일 첨부">
          <Paperclip className="size-[22px]" strokeWidth={1.75} />
        </button>
        <button disabled className="ml-[14px] grid size-[38px] place-items-center rounded-lg bg-[#E9EBF5] text-[#9A9EB7]" aria-label="보내기">
          <SendHorizontal className="size-[22px]" strokeWidth={1.75} />
        </button>
      </div>

      <div className="mt-[12px] flex justify-between">
        <Button variant="outline" className="h-[38px] w-[118px] gap-2 rounded-lg border-[#E3E5EC] bg-white text-[14.5px] font-medium hover:bg-[#F4F5F8]">
          <Undo2 className="size-[18px] text-[#3F4451]" />
          되돌리기
        </Button>
        <Button className="h-[38px] w-[132px] gap-2 rounded-lg text-[16px] font-semibold hover:bg-[#4338CA]">
          <Check className="size-[18px]" />
          결정 확정
        </Button>
      </div>
    </section>
  );
}

function AiMessage({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="grid h-8 w-[34px] place-items-center rounded-lg bg-[#E2E0FD] text-[15px] font-bold text-[#4338E5]">AI</span>
      <p className="rounded-xl border border-[#E8E9EF] bg-white px-[13px] text-[17px] leading-[38px]">{text}</p>
    </div>
  );
}
