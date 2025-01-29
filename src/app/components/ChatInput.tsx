import { Switch } from "./ui/Switch";
import { Label } from "./ui/Label";
import { Dispatch, SetStateAction } from "react";

interface ChatInputProps {
    input: string;
    searchEnabled: boolean;
    reasoningEnabled: boolean;
    searchProvider: "tavily" | "openperplex";
    font: { className: string };
    handleSubmit: (e: React.FormEvent) => void;
    setInput: Dispatch<SetStateAction<string>>;
    setSearchEnabled: Dispatch<SetStateAction<boolean>>;
    setReasoningEnabled: Dispatch<SetStateAction<boolean>>;
    setSearchProvider: Dispatch<SetStateAction<"tavily" | "openperplex">>;
}

export function ChatInput({
    input,
    searchEnabled,
    reasoningEnabled,
    searchProvider,
    font,
    handleSubmit,
    setInput,
    setSearchEnabled,
    setReasoningEnabled,
    setSearchProvider,
}: ChatInputProps) {
    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        // Add console logs
        console.log('User Query:', input.trim());
        console.log('Search Enabled:', searchEnabled);
        console.log('Search Provider:', searchProvider);
        console.log('Reasoning Enabled:', reasoningEnabled);

        handleSubmit(e);
    };

    return (
        <form
            onSubmit={handleFormSubmit}
            className="max-w-xl mx-auto"
        >
            <div className="relative flex items-center gap-3 bg-white rounded-xl border border-[#4A4235]/15 shadow-sm hover:shadow-md transition-all duration-300 w-full group focus-within:border-[#4A4235]/30 focus-within:shadow-lg">
                {/* Control Toggles */}
                <div className="flex items-center gap-1.5 p-3">
                    <div className="flex flex-col gap-2 w-[180px] pr-3 border-r border-[#4A4235]/10 my-2">
                        <div className="flex items-start gap-2">
                            <Switch
                                checked={searchEnabled}
                                onCheckedChange={(checked: boolean | ((prevState: boolean) => boolean)) => setSearchEnabled(checked)}
                                className="data-[state=checked]:bg-[#4A4235]"
                            />
                            <div className="flex items-center gap-2">
                                <Label className={`text-sm transition-opacity duration-200 ${searchEnabled ? 'text-[#4A4235] font-medium opacity-100' : 'text-[#4A4235] opacity-50'}`}>
                                    Search
                                </Label>
                                {searchEnabled && (
                                    <button
                                        type="button"
                                        className={`ml-1.5 text-xs font-medium px-2 py-0.5 rounded-full transition-all ${searchProvider === 'openperplex'
                                            ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-700 hover:from-amber-500/30 hover:to-amber-600/30 hover:text-amber-800 shadow-sm'
                                            : 'bg-[#4A4235]/5 text-[#4A4235]/60 hover:bg-[#4A4235]/10 hover:text-[#4A4235]/80'
                                            }`}
                                        onClick={() => setSearchProvider(searchProvider === 'tavily' ? 'openperplex' : 'tavily')}
                                    >
                                        {searchProvider === 'openperplex' ? 'PRO' : 'Basic'}
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={reasoningEnabled}
                                onCheckedChange={(checked: boolean | ((prevState: boolean) => boolean)) => setReasoningEnabled(checked)}
                                className="data-[state=checked]:bg-[#4A4235]"
                            />
                            <Label className={`text-sm transition-opacity duration-200 ${reasoningEnabled ? 'text-[#4A4235] font-medium opacity-100' : 'text-[#4A4235] opacity-50'}`}>
                                Reasoning
                            </Label>
                        </div>
                    </div>
                </div>

                {/* Input Area */}
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && input.trim()) {
                            e.preventDefault();
                            handleFormSubmit(e);
                        }
                    }}
                    placeholder="What's on your mind?"
                    className={`flex-1 min-h-[48px] py-2 px-3 text-[#2C2C2C] ${font.className}
                        bg-white border-none focus:outline-none resize-none text-base
                        leading-relaxed font-mono placeholder:text-[#2C2C2C]/30`}
                    style={{
                        height: '48px',
                        overflow: 'hidden'
                    }}
                    onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement
                        target.style.height = '48px'
                        target.style.height = `${Math.min(target.scrollHeight, 200)}px`
                    }}
                />

                {/* Send Button */}
                <div className="transition-all duration-300 ease-out opacity-0 scale-90 origin-center"
                    style={{
                        opacity: input.trim() ? 1 : 0,
                        transform: input.trim() ? 'scale(1)' : 'scale(0.9)',
                        transitionDuration: input.trim() ? '300ms' : '150ms'
                    }}>
                    <button
                        type="submit"
                        className="mr-3 p-2.5 rounded-xl transition-all text-white bg-[#4A4235] hover:bg-[#4A4235]/90 active:scale-95 shadow-sm"
                    >
                        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>
        </form>
    )
}