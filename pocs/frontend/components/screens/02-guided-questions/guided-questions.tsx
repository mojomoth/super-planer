"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Gamepad2, Info, Leaf, Mail, Star } from "lucide-react";
import { Logo } from "@/components/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

const OPTIONS = [
  {
    value: "rest",
    icon: Leaf,
    title: "편안한 휴식",
    desc: "바쁜 일상에서 벗어나, 조용하고 따뜻한 분위기 속에서 마음이 쉬어가는 느낌이에요.",
  },
  {
    value: "story",
    icon: BookOpen,
    title: "이야기 속 몰입",
    desc: "우체국과 마을 사람들의 이야기 속에 자연스럽게 빠져드는 경험이에요.",
  },
  {
    value: "achieve",
    icon: Star,
    title: "작은 성취의 즐거움",
    desc: "편지를 무사히 전달하고, 마을 사람들의 반응을 보며 소소한 보람을 느끼는 경험이에요.",
  },
];

export function GuidedQuestions() {
  const [selected, setSelected] = useState("rest");

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F7FB] text-[#18181B]">
      <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-[#E4E4EB] pr-[26px] pl-[21px]">
        <Link
          href="/"
          className="flex h-10 items-center gap-[16px] rounded-[10px] px-3 text-[19px] font-medium hover:bg-[#EFEFF4]"
        >
          <ArrowLeft className="size-6" strokeWidth={2} />
          이전으로
        </Link>
        <Avatar className="size-[34px] after:border-0">
          <AvatarFallback className="bg-[#D9DBE4] text-[19px] font-semibold text-[#18181B]">J</AvatarFallback>
        </Avatar>
      </header>

      <main className="flex flex-col items-center pt-[25px]">
        <Logo size={57} />

        <div className="mt-[28px] flex h-[59px] w-[565px] items-center rounded-[10px] border border-[#E0E2EA] bg-[#F3F4F8] pl-7 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <Mail className="size-7 text-[#27272A]" strokeWidth={1.75} />
          <span className="mx-6 h-7 w-px bg-[#D4D6DE]" />
          <span className="text-[24px] font-semibold text-[#1F2230]">작은 숲속 마을에서 편지를 배달하는 힐링 게임</span>
        </div>

        <Card className="mt-[22px] w-[907px] gap-0 rounded-[12px] border border-[#E4E4E7] p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ring-0">
          <div className="flex h-[31px] items-center justify-between">
            <span className="pl-[3px] text-[21px] font-bold">질문 2 / 5</span>
            <Badge className="h-[31px] gap-2.5 rounded-[7px] bg-[#ECEBFD] px-3.5 text-[16px] font-medium text-[#3B3A66] [&>svg]:size-[22px]!">
              <Gamepad2 className="size-[22px]" strokeWidth={1.75} />
              플레이 경험
            </Badge>
          </div>

          <Progress value={40.5} className="mt-2.5 h-2.5 bg-[#E5E6EF] [&>div]:rounded-full" />

          <h1 className="mt-[28px] pl-[3px] text-[36px] leading-[1.4] font-bold tracking-[-0.01em]">
            플레이어가 어떤 기분을 느끼면 좋을까요?
          </h1>
          <p className="mt-0.5 pl-[3px] text-[20px] text-[#52525B]">가장 가까운 답을 고르거나, 직접 적어주세요.</p>

          <RadioGroup value={selected} onValueChange={setSelected} className="mt-[19px] gap-[9px]">
            {OPTIONS.map(({ value, icon: Icon, title, desc }) => {
              const checked = selected === value;
              return (
                <label
                  key={value}
                  className={cn(
                    "flex h-20 cursor-pointer items-center rounded-[10px] border pr-[18px]",
                    checked
                      ? "border-2 border-[#4F46E5] bg-[#EFEEFD]"
                      : "border-[#E0E2E7] bg-white hover:border-[#C7C9D1] hover:bg-[#FAFAFC]",
                  )}
                >
                  <span className="flex w-[94px] shrink-0 justify-center">
                    <Icon className="size-8 text-[#3F3F46]" strokeWidth={1.5} />
                  </span>
                  <span className={cn("h-[46px] w-px shrink-0", checked ? "bg-[#C9C7F0]" : "bg-[#D4D7E1]")} />
                  <span className="-mt-1 ml-[21px] flex flex-1 flex-col gap-[5px]">
                    <span className="text-[21.5px] leading-6 font-bold">{title}</span>
                    <span className="text-[17px] leading-5 text-[#52525B]">{desc}</span>
                  </span>
                  <RadioGroupItem
                    value={value}
                    aria-label={title}
                    className="size-[26px] border-[1.5px] border-[#A1A1AA] bg-white focus-visible:ring-[#4F46E5]/30 data-[state=checked]:border-2 data-[state=checked]:border-[#4F46E5] data-[state=checked]:bg-white [&_span_span]:size-[14px] [&_span_span]:bg-[#4F46E5]"
                  />
                </label>
              );
            })}
          </RadioGroup>

          <Label htmlFor="custom-answer" className="mt-[18px] pl-0.5 text-[18.5px] font-bold">
            직접 입력
          </Label>
          <Input
            id="custom-answer"
            placeholder="원하는 경험을 자유롭게 적어주세요"
            className="mt-1 h-12 rounded-[10px] border-[#DDDFE6] bg-white px-5 text-[18px] placeholder:text-[#71717A] focus-visible:border-[#4F46E5] focus-visible:ring-[#4F46E5]/20 md:text-[18px]"
          />

          <div className="mt-7 flex justify-between">
            <Button
              asChild
              variant="outline"
              className="h-12 w-[158px] gap-3.5 rounded-[10px] border-[#D7D9E1] bg-white text-[18px] font-semibold hover:bg-[#F4F4F5]"
            >
              <Link href="/">
                <ArrowLeft className="size-5" strokeWidth={2} />
                이전 질문
              </Link>
            </Button>
            <Button
              asChild
              className="h-12 w-[152px] gap-4 rounded-[10px] bg-[#4F46E5] text-[18px] font-semibold hover:bg-[#4338CA]"
            >
              <Link href="/workflow">
                다음 질문
                <ArrowRight className="size-5" strokeWidth={2} />
              </Link>
            </Button>
          </div>
        </Card>

        <p className="mt-[17px] flex items-center gap-[11px] text-[17.5px] text-[#52525B]">
          <Info className="size-[21px]" strokeWidth={1.5} />
          정답은 없어요. 나중에 언제든 바꿀 수 있어요.
        </p>
      </main>
    </div>
  );
}
