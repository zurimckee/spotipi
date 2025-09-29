import tkinter as tk

def main():
    root = tk.Tk()
    root.title("Music Player")
    root.geometry("400x300")
    label = tk.Label(root, text="Hi, welcome to the Music Player!", font=("Arial", 16))
    label.pack(pady=20)
    root.mainloop()

if __name__ == "__main__":
    main()