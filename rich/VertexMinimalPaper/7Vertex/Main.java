import java.awt.*;
import java.awt.event.*;
import java.math.*;
import java.awt.geom.*;
import java.io.*;
import java.util.*;
import java.awt.Panel;

public class Main extends Panel {
    ControlCanvas C;
    PopupPictureCanvas PP;
    PopupDocumentCanvas PD;
    Manager M;

    public static void main(String[] args) {
        Main a = new Main();
        Frame F = new Frame("Control Canvas");

        a.setBackground(Color.black);
        a.init();
        F.add(a);
        F.pack();
        F.addWindowListener(new WinList(F));
        F.setVisible(true);
    }

    public void init() {
        C = new ControlCanvas();
        PP = new PopupPictureCanvas();
        PD = new PopupDocumentCanvas();
        M = new Manager();
        C.setSize(500, 230);
        M.P = PP.P;
        M.D = PD.D;
        M.C = C;
        C.M = M;
        PP.P.M = M;
        PD.D.M = M;
        add(C);
    }
}
