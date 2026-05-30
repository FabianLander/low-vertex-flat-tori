//pat's popup window

import java.awt.*;
import java.awt.event.*;

public class PopupWindow extends Frame
implements ComponentListener, WindowListener {
    
    String windowName;
    public Component C;
    
    /** Creates a new instance of ResizableFrame */
    public PopupWindow(String windowName, Component C) {
        super(windowName);
        this.C=C;
        add(C);
        pack();
        addComponentListener(this);
        addWindowListener(this);
        setVisible(true);
    }
        
    public void forceClose() {
        dispose();
        C=null;
        removeAll();
        System.gc();
    }
    
    
    public void componentHidden(ComponentEvent e) {}
    public void componentMoved(ComponentEvent e) {}
    public void componentResized(ComponentEvent e) {
        C.setSize(C.getWidth() - (getInsets().left + getInsets().right),
        C.getHeight() - (getInsets().top + getInsets().bottom));
        getLayout().layoutContainer(this);
    }
    
    public void componentShown(ComponentEvent e) {
        setSize(C.getWidth() + (getInsets().left + getInsets().right),
        C.getHeight() + (getInsets().top + getInsets().bottom));
        getLayout().layoutContainer(this);
    }
    
    
    public void windowActivated(java.awt.event.WindowEvent windowEvent) {}
    public void windowClosed(java.awt.event.WindowEvent windowEvent) {}
    public void windowClosing(java.awt.event.WindowEvent windowEvent) {
        dispose();
        C=null;
        removeAll();
        System.gc();
    }
    
    public void windowDeactivated(java.awt.event.WindowEvent windowEvent) {}
    public void windowDeiconified(java.awt.event.WindowEvent windowEvent) {}
    public void windowIconified(java.awt.event.WindowEvent windowEvent) {}
    public void windowOpened(java.awt.event.WindowEvent windowEvent) {}
}
