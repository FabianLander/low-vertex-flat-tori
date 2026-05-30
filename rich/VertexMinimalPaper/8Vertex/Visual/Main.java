import java.awt.*;
import java.awt.event.*;
import java.math.*;
import java.awt.geom.*;
import java.io.*;
import java.util.*;
import java.awt.Panel;

public class Main extends Panel {
    ControlCanvas C;
    Manager M;

    public static void main(String[] args) {
        Main a = new Main();
        Frame F = new Frame("Control Panel");

        a.setBackground(Color.black);
        a.init();
        F.add(a);
        F.pack();
        F.addWindowListener(new WinList(F));
        F.setVisible(true);
    }

    public void init() {
        C = new ControlCanvas();
        M = new Manager();
        C.setSize(550, 370);
        M.C = C;
        C.M = M;
	add(C);
        C.POP=new PopupManager(M,0,155);
    }
}
